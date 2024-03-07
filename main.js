import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera = 'Inside lookalike sphere', transformation = 'Lorentz', scene;
let aspectRatioU = 4.0/3.0, aspectRatioE = 4.0/3.0;
let renderer, videoU, videoE;
let cameraInside, cameraOutside;
let controls, shaderMaterial, geometry, lookalikeSphere, transformationMatrix;
let share = false;

// Nokia HR20, according to https://www.camerafv5.com/devices/manufacturers/hmd_global/nokia_xr20_ttg_0/
let fovU = 67.3;
let fovE = 68.3;
let fovS = 90;

// the Cartesian components of the boost, in units of c
// ()
let betaX = 0, betaY = 0, betaZ = 0;

// device orientation
// let deviceAlpha = 0, deviceBeta = 90, deviceGamma = 0;

// boost orientation
// let boostAlpha = 0, boostBeta = 90, boostGamma = 0;

let cameraOutsideDistance = 4.0;

let info = document.createElement('div');
let infotime;	// the time the last info was posted

init();
animate();

function init() {
	// create the info element first so that any problems can be communicated
	createInfo();

	// // list all the media devices (so that, maybe, later we can select cameras from this list)
	// if (!navigator.mediaDevices?.enumerateDevices) {
	// 	console.log("enumerateDevices() not supported.");
	// } else {
	// 	// List cameras and microphones.
	// 	navigator.mediaDevices
	// 	  .enumerateDevices()
	// 	  .then((devices) => {
	// 		devices.forEach((device) => {
	// 		  console.log(`${device.kind}: ${device.label}, id = ${device.deviceId}`);
	// 		  console.log(device.getCapabilities());
	// 		//   console.log(device.getCapabilities().aspectRatio);
	// 		//   console.log(device.getCapabilities().facingMode);
	// 		//   console.log(device.getCapabilities().width);
	// 		//   console.log(device.getCapabilities().height);
	// 		//   console.log(device.getCapabilities().resizeMode);
	// 		});
	// 	  })
	// 	  .catch((err) => {
	// 		console.error(`${err.name}: ${err.message}`);
	// 	  });
	// }

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 'skyblue' );
	let windowAspectRatio = window.innerWidth / window.innerHeight;
	cameraInside = new THREE.PerspectiveCamera( fovS, windowAspectRatio, 0.00001, 2.1 );
	cameraOutside = new THREE.PerspectiveCamera( fovS, windowAspectRatio, 0.001, 10 );
	cameraOutside.position.z = cameraOutsideDistance;
	screenChanged();
	
	renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	createVideoFeeds();

	createLookalikeSphere();

	// user interface

	// handle device orientation
	// window.addEventListener("deviceorientation", handleOrientation, true);

	// handle window resize
	window.addEventListener("resize", onWindowResize, false);

	// handle screen-orientation (landscape/portrait) change
	screen.orientation.addEventListener("change", onScreenOrientationChange);

	// add orbit controls to outside camera
	addOrbitControls();	// add to outside camera

	// the controls menu
	createGUI();
}

// function handleOrientation(event) {
// 	const absolute = event.absolute;
// 	deviceAlpha = event.alpha;
// 	deviceBeta = event.beta;
// 	deviceGamma = event.gamma;
  
// 	// Do stuff with the new orientation data
// 	setInfo(`Orientation: &alpha; = ${deviceAlpha.toFixed(2)}, &beta; = ${deviceBeta.toFixed(2)}, &gamma; = ${deviceGamma.toFixed(2)}`);
//   }

/** 
 * Add a text field to the bottom left corner of the screen
 */
function createInfo() {
	// see https://stackoverflow.com/questions/15248872/dynamically-create-2d-text-in-three-js
	info.style.position = 'absolute';
	info.style.backgroundColor = "rgba(0, 0, 0, 0.5)";	// semi-transparent white
	info.style.color = "White";
	info.style.fontFamily = "Arial";
	info.style.fontSize = "9pt";
	setInfo("Welcome!");
	info.style.bottom = 0 + 'px';
	info.style.left = 0 + 'px';
	document.body.appendChild(info);	
}

function setInfo(text) {
	info.innerHTML = text;
	console.log(text);

	// show the text only for 3 seconds
	infotime = new Date().getTime();
	setTimeout( () => { if(new Date().getTime() - infotime > 2999) info.innerHTML = `Einstagram, University of Glasgow, <a href="https://github.com/jkcuk/Einstagram">https://github.com/jkcuk/Einstagram</a>` }, 3000);
}

function showInfo() {
	if(new Date().getTime() - infotime < 1000) info.innerHTML = infotext;
	else info.innerHTML =  `Einstagram, University of Glasgow`;
	// else info.innerHTML =  `Einstagram, University of Glasgow, ${transformation} transformation, &beta; = (${betaX}, ${betaY}, ${betaZ}), screen horiz. FOV = ${fovS}&deg;, ${camera}`;
}

function setWarning(warning) {
	shaderMaterial.uniforms.warning.value = warning;
}

function animate() {
	requestAnimationFrame( animate );

	// calculate the matrix that describes the correct distortion of the lookalike sphere
	updateTransformationMatrix();
	
	// set the camera, either to the inside camera or the outside camera
	switch(camera)
	{
		case 'Outside lookalike sphere':
			renderer.render( scene, cameraOutside );
			break;
		case 'Inside lookalike sphere':
		default:
			renderer.render( scene, cameraInside );
	}

	if(share) {
		try {
			const image = renderer.domElement.toDataURL('image/jpg');
	
			// Use the Web Share API to share the screenshot
			if (navigator.share) {
				navigator.share({
					title: 'Einstagram image',
					text: 'Check out this image rendered using Three.js!',
					url: image,
					// files: [new File([image], 'Einstagram.jpg', {type: 'image/jpg'})]
				});
			} else {
				throw new Error('Web Share API is not supported in this browser.');
			}
		} catch (error) {
			console.error('Error:', error);
			// Handle errors
		}
		share = false;
	}
}

function createVideoFeeds() {
	videoU = document.getElementById( 'videoU' );
	videoE = document.getElementById( 'videoE' );

	// see https://github.com/mrdoob/three.js/blob/master/examples/webgl_materials_video_webcam.html
	if ( navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {
		// user-facing camera
		const constraintsU = { video: { 
			// 'deviceId': cameraId,	// this could be the device ID selected 
			width: {ideal: 1280},	// {ideal: 10000}, 
			// height: {ideal: 10000}, 
			facingMode: {ideal: 'user'},
			// aspectRatio: { exact: width / height }
		} };
		navigator.mediaDevices.getUserMedia( constraintsU ).then( function ( stream ) {
			// apply the stream to the video element used in the texture
			videoU.srcObject = stream;
			videoU.play();

			videoU.addEventListener("playing", () => {
				// console.log(`Video stream playing, size ${videoU.videoWidth} x ${videoU.videoHeight}`);
				aspectRatioU = videoU.videoWidth / videoU.videoHeight;
				updateUniforms();
				// setInfo(`User-facing camera ${videoU.videoWidth} &times; ${videoU.videoHeight}`);
			});
		} ).catch( function ( error ) {
			setInfo(`Unable to access camera/webcam (Error: ${error})`);
		} );

		// environment-facing camera
		const constraintsE = { video: {
			width: {ideal: 1280},	// {ideal: 10000}, 
			// height: {ideal: 10000}, 
			facingMode: {ideal: 'environment'},
			// aspectRatio: { exact: width / height }
		} };
		navigator.mediaDevices.getUserMedia( constraintsE ).then( function ( stream ) {
			// apply the stream to the video element used in the texture
			videoE.srcObject = stream;
			videoE.play();

			videoE.addEventListener("playing", () => {
				// console.log(`Video stream playing, size ${videoE.videoWidth} x ${videoE.videoHeight}`);
				aspectRatioE = videoE.videoWidth / videoE.videoHeight;
				updateUniforms();
			  });
		} ).catch( function ( error ) {
			setInfo( 'Unable to access camera/webcam.', error );
		} );
	} else {
		setInfo( 'MediaDevices interface, which is required for video streams from device cameras, not available.' );
	}
}

/** create lookalike sphere, textures, transformation matrix */
function createLookalikeSphere() {
	const textureU = new THREE.VideoTexture( videoU );
	textureU.colorSpace = THREE.SRGBColorSpace;

	const textureE = new THREE.VideoTexture( videoE );
	textureE.colorSpace = THREE.SRGBColorSpace;

	// the lookalike sphere
	geometry = new THREE.SphereGeometry( 1, 200, 200 );
	shaderMaterial = new THREE.ShaderMaterial({
		side: THREE.DoubleSide,
		uniforms: { 
			textureU: { value: textureU }, 
			textureE: { value: textureE },
			tanHalfFovHU: { value: 1.0 },
			tanHalfFovVU: { value: 1.0 },
			tanHalfFovHE: { value: 1.0 },
			tanHalfFovVE: { value: 1.0 },
			warning: { value: false }
		},
		// wireframe: true,
		vertexShader: `
			varying vec2 zPlaneCoord;
			varying float positionZ;
			void main()	{
				// projectionMatrix, modelViewMatrix, position -> passed in from Three.js
				zPlaneCoord = position.xy / position.z;
 				positionZ = position.z;
  				gl_Position = projectionMatrix
					* modelViewMatrix
					* vec4(position, 1.0);
			}
		`,
		fragmentShader: `
			precision highp float;

			varying vec2 zPlaneCoord;
			varying float positionZ;

			uniform sampler2D textureE;
			uniform sampler2D textureU;
			uniform float tanHalfFovHU;
			uniform float tanHalfFovVU;
			uniform float tanHalfFovHE;
			uniform float tanHalfFovVE;

			uniform bool warning;
			
			void main() {
				if(positionZ < 0.0) {
					// environment-facing camera
					if((abs(zPlaneCoord.x) < tanHalfFovHE) && (abs(zPlaneCoord.y) < tanHalfFovVE)) {
						gl_FragColor = texture2D(textureE, vec2(0.5-0.5*zPlaneCoord.x/tanHalfFovHE, 0.5-0.5*zPlaneCoord.y/tanHalfFovVE));
					} else {
						gl_FragColor = vec4(0.9, 0.9, 0.9, 1.0);
					}
				} else {
					// user-facing camera
					if((abs(zPlaneCoord.x) < tanHalfFovHU) && (abs(zPlaneCoord.y) < tanHalfFovVU)) {
						gl_FragColor = texture2D(textureU, vec2(0.5-0.5*zPlaneCoord.x/tanHalfFovHU, 0.5+0.5*zPlaneCoord.y/tanHalfFovVU));
					} else {
						gl_FragColor = vec4(0.9, 0.0, 0.0, 1.0);
					}
				}
				if(warning) {
					gl_FragColor.r = 1.0;
					gl_FragColor.gb *= 0.5;
				}
			}
		`
	});
	lookalikeSphere = new THREE.Mesh( geometry, shaderMaterial );
	lookalikeSphere.matrixAutoUpdate = false;	// we will update the matrix ourselves
	scene.add( lookalikeSphere );

	// also create the lookalike sphere's transformation matrix
	transformationMatrix = new THREE.Matrix4();
	transformationMatrix.identity();
}

function addOrbitControls() {
	// controls

	controls = new OrbitControls( cameraOutside, renderer.domElement );
	controls.listenToKeyEvents( window ); // optional

	//controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)

	controls.enableDamping = false; // an animation loop is required when either damping or auto-rotation are enabled
	controls.dampingFactor = 0.05;

	controls.enablePan = false;
	controls.enableZoom = false;

	// allowing control of the distance can result in the view being no longer 
	// centred on the origin, so don't allow it
	controls.minDistance = cameraOutsideDistance;
	controls.maxDistance = cameraOutsideDistance;

	controls.maxPolarAngle = Math.PI;
}

// see https://github.com/mrdoob/three.js/blob/master/examples/webgl_animation_skinning_additive_blending.html
function createGUI() {
	const gui = new GUI();

	var text =
	{
    	'Camera position': camera,
		'Transformation': transformation
	}
	gui.add(text, 'Camera position', { 'Inside lookalike sphere': 'Inside lookalike sphere', 'Outside lookalike sphere': 'Outside lookalike sphere' } ).onChange( changeCamera );
	gui.add(text, 'Transformation', { 'Lorentz': 'Lorentz', 'Galileo': 'Galileo' } ).onChange( (s) => { transformation = s; console.log(s); });

	const params = {
		'Toggle fullscreen': function() {
			if (!document.fullscreenElement) {
				document.documentElement.requestFullscreen().catch((err) => {
				  alert(
					`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`,
				  );
				});
				// allow screen orientation changes
				// screen.orientation.unlock();
			} else {
				document.exitFullscreen();
			}
		},
		'Share image': function() { share = true; },
		'&beta;<sub>x</sub>': betaX,
		'&beta;<sub>y</sub>': betaY,
		'&beta;<sub>z</sub>': betaZ,
		'user-facing camera': fovU,
		'env.-facing camera': fovE,
		'screen': fovS,
		'<i>z</i> coordinate': cameraOutside.position.z,
		point_forward:function(){ pointForward(); }
	}

	gui.add(params, 'Toggle fullscreen');
	gui.add(params, 'Share image');
	const folderBeta = gui.addFolder( '&beta;' );
	folderBeta.add( params, '&beta;<sub>x</sub>', -0.99, 0.99, 0.01).onChange( (value) => { betaX = value; updateTransformationMatrix(); })
	folderBeta.add( params, '&beta;<sub>y</sub>', -0.99, 0.99, 0.01).onChange( (value) => { betaY = value; updateTransformationMatrix(); })
	folderBeta.add( params, '&beta;<sub>z</sub>', -0.99, 0.99, 0.01).onChange( (value) => { betaZ = value; updateTransformationMatrix(); })

	const folderFOV = gui.addFolder( 'FOV' );
	folderFOV.add( params, 'user-facing camera', 10, 170, 1).onChange( (fov) => { fovU = fov; updateUniforms(); });   
	folderFOV.add( params, 'env.-facing camera', 10, 170, 1).onChange( (fov) => { fovE = fov; updateUniforms(); });   
	folderFOV.add( params, 'screen', 10, 170, 1).onChange( setScreenFOV );   
	folderFOV.open();
}

/**
 * @param {*} fov	The larger of the camera's horizontal and vertical FOV, in degrees
 * 
 * Set the larger FOV of the screen/window to fov.
 * 
 * Depending on the screen/window's FOV, fov is either the horizontal fov (if screen width > screen height)
 * or the vertical fov (if screen width < screen height).
 */
function setScreenFOV(fov) {
	fovS = fov;

	screenChanged();
}

/** 
 * Reset the aspect ratio and FOV of the virtual cameras.
 * 
 * Call if the window size has changed (which also happens when the screen orientation changes)
 * or if camera's FOV has changed
 */
function screenChanged() {
	// alert(`new window size ${window.innerWidth} x ${window.innerHeight}`);

	// in case the screen size has changed
	if(renderer) renderer.setSize(window.innerWidth, window.innerHeight);

	// if the screen orientation changes, width and height swap places, so the aspect ratio changes
	let windowAspectRatio = window.innerWidth / window.innerHeight;
	cameraInside.aspect = windowAspectRatio;
	cameraOutside.aspect = windowAspectRatio;

	// fovS is the screen's horizontal or vertical FOV, whichever is greater;
	// re-calculate the camera FOV, which is the *vertical* fov
	let verticalFOV;
	if(windowAspectRatio > 1.0) {
		// fovS is horizontal FOV; convert to get correct vertical FOV
		verticalFOV = 2.0*Math.atan(Math.tan(0.5*fovS*Math.PI/180.0)/windowAspectRatio)*180.0/Math.PI;
	} else {
		// fovS is already vertical FOV
		verticalFOV = fovS;
		// alert(`vertical FOV ${verticalFOV}`);
	}
	cameraOutside.fov = verticalFOV;
	cameraInside.fov = verticalFOV;

	// make sure the camera changes take effect
	cameraOutside.updateProjectionMatrix();
	cameraInside.updateProjectionMatrix();
}

function onWindowResize() {
	screenChanged();
	setInfo(`window size ${window.innerWidth} &times; ${window.innerHeight}`);	// debug
}

function changeCamera(newCamera) {
	camera = newCamera;
	
	controls.enabled = (camera == 'Outside lookalike sphere');
}

function updateUniforms() {
	if(aspectRatioU > 1.0) {
		// horizontal orientation
		shaderMaterial.uniforms.tanHalfFovHU.value = Math.tan(0.5*fovU*Math.PI/180.0);
		shaderMaterial.uniforms.tanHalfFovVU.value = Math.tan(0.5*fovU*Math.PI/180.0)/aspectRatioU;
	} else {
		// vertical orientation
		shaderMaterial.uniforms.tanHalfFovHU.value = Math.tan(0.5*fovU*Math.PI/180.0)*aspectRatioU;
		shaderMaterial.uniforms.tanHalfFovVU.value = Math.tan(0.5*fovU*Math.PI/180.0);
	}

	if(aspectRatioE > 1.0) {
		// horizontal orientation
		shaderMaterial.uniforms.tanHalfFovHE.value = Math.tan(0.5*fovE*Math.PI/180.0);
		shaderMaterial.uniforms.tanHalfFovVE.value = Math.tan(0.5*fovE*Math.PI/180.0)/aspectRatioE;
	} else {
		// vertical orientation
		shaderMaterial.uniforms.tanHalfFovHE.value = Math.tan(0.5*fovE*Math.PI/180.0)*aspectRatioE;
		shaderMaterial.uniforms.tanHalfFovVE.value = Math.tan(0.5*fovE*Math.PI/180.0);
	}
}

function updateTransformationMatrix() {
	//transform to theta and phi
	let beta2 = betaX*betaX + betaY*betaY + betaZ*betaZ;
	if (beta2 >= 1 ){
		// don't actually update the transformation matrix, but leave it as is
		setWarning(true);
		setInfo(`Warning: &beta; (=${Math.sqrt(beta2).toFixed(2)}) > 1; using last value of <b>&beta;</b> with |&beta;| < 1`);
  	} else {
		// beta^2 < 1
		let beta, oneOverGamma, theta, phi;

    	beta = Math.sqrt(beta2);
		oneOverGamma = Math.sqrt(1-beta2);	//  1/gamma

		if (beta==0){
			theta=0
			phi=0;
		} else {
			theta = Math.asin(-betaY/beta);
			phi = Math.PI+Math.atan2(-betaX,betaZ);
			// setInfo(`(&theta;, &phi;) = (${theta.toFixed(2)}, ${phi.toFixed(2)})`);
		}

		// re-calculate the transformation matrix
		let m = new THREE.Matrix4();	
		// start from the identity matrix
		transformationMatrix.identity();	
		// rotate the beta direction into the z direction
		transformationMatrix.multiply(m.makeRotationY(phi));
		transformationMatrix.multiply(m.makeRotationX(theta));
		// scale by 1/gamma in the directions perpendicular to beta, i.e. x and y, 
		// if the Lorentz transformation is chosen
		if(transformation === 'Lorentz') transformationMatrix.multiply(m.makeScale(oneOverGamma, oneOverGamma, 1.0));
		// translate by beta in the direction of beta, i.e. z
		transformationMatrix.multiply(m.makeTranslation(new THREE.Vector3(0, 0, beta)));
		// rotate back to the original orientation
		transformationMatrix.multiply(m.makeRotationX(-theta));
		transformationMatrix.multiply(m.makeRotationY(-phi));

		// rotate the lookalike sphere according to the device orientation
		// see https://developer.mozilla.org/en-US/docs/Web/API/Device_orientation_events/Using_device_orientation_with_3D_transforms
		// transformationMatrix.multiply(m.makeRotationZ(deviceAlpha*Math.PI/180));
		// transformationMatrix.multiply(m.makeRotationX(-deviceBeta*Math.PI/180));
		// transformationMatrix.multiply(m.makeRotationY(deviceGamma*Math.PI/180));

		// set the lookalike sphere's transformation matrix to the matrix we just calculated
		lookalikeSphere.matrix.copy(transformationMatrix);

		if(shaderMaterial.uniforms.warning.value) {
			setWarning(false);
			setInfo(`&beta; < 1; all good!`);
		}
	}
}
	
// // see https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/change_event
function onScreenOrientationChange() {
	// stop current video streams...
	videoU.srcObject.getTracks().forEach(function(track) { track.stop(); });
	videoE.srcObject.getTracks().forEach(function(track) { track.stop(); });

	// ... and re-create new ones, hopefully of the appropriate size
	createVideoFeeds();
}

/*
async function share() {
	try {
        const image = renderer.domElement.toDataURL('image/png');

        // Use the Web Share API to share the screenshot
        if (navigator.share) {
            await navigator.share({
                title: 'Einstagram image',
				// text: 'Check out this image rendered using Three.js!',
                // url: image
                files: [new File([image], 'Einstagram.png', {type: 'image/png'})]
            });
        } else {
            throw new Error('Web Share API is not supported in this browser.');
        }
    } catch (error) {
        console.error('Error:', error);
        // Handle errors
    }
}
*/