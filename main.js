import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let cameraPosition = 'Inside lookalike sphere', transformation = 'Lorentz', scene;
let aspectRatioU = 4.0/3.0, aspectRatioE = 4.0/3.0;
let renderer, videoU, videoE;
let cameraInside, cameraOutside;
let controls, shaderMaterial, geometry, lookalikeSphere, transformationMatrix;

let fovU = 67;
let fovE = 90;
let fovS = 90;

let betaX = 0.0, betaY = 0.0, betaZ = 0.0;

let cameraOutsideDistance = 4.0;

init();
animate();

function init() {

	scene = new THREE.Scene();
	let windowAspectRatio = window.innerWidth / window.innerHeight;
	cameraInside = new THREE.PerspectiveCamera( 10, windowAspectRatio, 0.0001, 3 );
	cameraOutside = new THREE.PerspectiveCamera( 10, windowAspectRatio, 0.0001, 10 );
	cameraOutside.position.z = cameraOutsideDistance;
	updateScreenFOV(fovS);
	
	renderer = new THREE.WebGLRenderer();
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	createVideoFeeds();

	createLookalikeSphere();

	// user interface

	// handle window resize and screen-orientation change
	window.addEventListener("resize", onWindowResize, false);
	screen.orientation.addEventListener("change", onScreenOrientationChange);

	// add orbit controls to outside camera
	addOrbitControls();	// add to outside camera

	createGUI();
}

function setWarning(warning) {
	shaderMaterial.uniforms.warning.value = warning;
}

function animate() {
	// console.log(camera.position);
	requestAnimationFrame( animate );

	// calculate the matrix that describes the correct distortion of the lookalike sphere
	updateTransformationMatrix();
	
	// set the camera, either to the inside camera or the outside camera
	switch(cameraPosition)
	{
		case 'Outside lookalike sphere':
			renderer.render( scene, cameraOutside );
			break;
		case 'Inside lookalike sphere':
		default:
			renderer.render( scene, cameraInside );
	}
}

function createVideoFeeds() {
	videoU = document.getElementById( 'videoU' );
	videoE = document.getElementById( 'videoE' );

	// see https://github.com/mrdoob/three.js/blob/master/examples/webgl_materials_video_webcam.html
	if ( navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {
		// user-facing camera
		const constraintsU = { video: { 
			width: {ideal: 10000}, 
			height: {ideal: 10000}, 
			facingMode: {ideal: 'user'},
			// aspectRatio: { exact: width / height }
		} };
		navigator.mediaDevices.getUserMedia( constraintsU ).then( function ( stream ) {
			// apply the stream to the video element used in the texture
			videoU.srcObject = stream;
			videoU.play();

			videoU.addEventListener("playing", () => {
				console.log(`Video stream playing, size ${videoU.videoWidth} x ${videoU.videoHeight}`);
				aspectRatioU = videoU.videoWidth / videoU.videoHeight;
				updateUniforms();
			  });
		} ).catch( function ( error ) {
			alert( 'Unable to access camera/webcam.', error );
		} );

		// environment-facing camera
		const constraintsE = { video: {
			width: {ideal: 10000}, 
			height: {ideal: 10000}, 
			facingMode: {ideal: 'environment'},
			// aspectRatio: { exact: width / height }
		} };
		navigator.mediaDevices.getUserMedia( constraintsE ).then( function ( stream ) {
			// apply the stream to the video element used in the texture
			videoE.srcObject = stream;
			videoE.play();

			videoE.addEventListener("playing", () => {
				console.log(`Video stream playing, size ${videoE.videoWidth} x ${videoE.videoHeight}`);
				aspectRatioE = videoE.videoWidth / videoE.videoHeight;
				updateUniforms();
			  });
		} ).catch( function ( error ) {
			alert( 'Unable to access camera/webcam.', error );
		} );
	} else {
		alert( 'MediaDevices interface, which is required for video streams from device cameras, not available.' );
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
	// geometry.scale(betaX, betaY, betaZ);
	// const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
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
						gl_FragColor = texture2D(textureU, vec2(0.5+0.5*zPlaneCoord.x/tanHalfFovHU, 0.5+0.5*zPlaneCoord.y/tanHalfFovVU));
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

	controls.screenSpacePanning = false;

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
    	'Camera position': cameraPosition,
		'Transformation': transformation
	}
	gui.add(text, 'Camera position', { 'Inside lookalike sphere': 'Inside lookalike sphere', 'Outside lookalike sphere': 'Outside lookalike sphere' } ).onChange( changeCameraPosition );
	gui.add(text, 'Transformation', { 'Lorentz': 'Lorentz', 'Galileo': 'Galileo' } ).onChange( (s) => { transformation = s; console.log(s); });

	const params = {
		'Toggle fullscreen': function() {
			// alert(`Fullscreen: ${document.body.fullscreenElement}, ${document.fullscreenElement}`);
			if (!document.fullscreenElement) {
				document.documentElement.requestFullscreen().catch((err) => {
				  alert(
					`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`,
				  );
				});
			} else {
				document.exitFullscreen();
			}
			// document.body.requestFullscreen();
			// renderer.domElement.requestFullscreen(); 
		},
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
	const folderBeta = gui.addFolder( '&beta;' );
	folderBeta.add( params, '&beta;<sub>x</sub>', -0.99, 0.99, 0.01).onChange( (value) => { betaX = value; updateTransformationMatrix(); })
	folderBeta.add( params, '&beta;<sub>y</sub>', -0.99, 0.99, 0.01).onChange( (value) => { betaY = value; updateTransformationMatrix(); })
	folderBeta.add( params, '&beta;<sub>z</sub>', -0.99, 0.99, 0.01).onChange( (value) => { betaZ = value; updateTransformationMatrix(); })

	const folderFOV = gui.addFolder( 'FOV' );
	folderFOV.add( params, 'user-facing camera', 10, 170, 1).onChange( (fov) => { fovU = fov; updateUniforms(); });   
	folderFOV.add( params, 'env.-facing camera', 10, 170, 1).onChange( (fov) => { fovE = fov; updateUniforms(); });   
	folderFOV.add( params, 'screen', 10, 170, 1).onChange( updateScreenFOV );   
	folderFOV.open();

	/*
	const cameraFolder = gui.addFolder( 'Camera' );
	cameraFolder.add( params, '<i>z</i> coordinate', 0, 5, 0.01).onChange( changeCameraDistance );
	cameraFolder.add( params, 'point_forward');
	*/
}

function updateScreenFOV(fov)
{
	fovS = fov;	// horizontal or vertical FOV, whichever is greater
	let windowAspectRatio = window.innerWidth / window.innerHeight;
	let verticalFOV;
	if(windowAspectRatio > 1) {
		// fovS is horizontal FOV; convert to get correct vertical FOV
		verticalFOV = 2.0*Math.atan(Math.tan(0.5*fovS*Math.PI/180.0)/windowAspectRatio)*180.0/Math.PI;
	} else {
		// fovS is already vertical FOV
		verticalFOV = fovS;
	}
	cameraOutside.fov = verticalFOV;	// convert to vertical FOV
	cameraInside.fov = verticalFOV; 	// convert to vertiacl FOV
	cameraOutside.updateProjectionMatrix();
	cameraInside.updateProjectionMatrix();
	// console.log(`window aspect ratio ${windowAspectRatio}, (horizontal) fovS ${fovS}, camera (vertical) fov ${verticalFOV}`)
}

function onWindowResize() {
	cameraInside.aspect = window.innerWidth / window.innerHeight;
	cameraInside.updateProjectionMatrix();

	cameraOutside.aspect = window.innerWidth / window.innerHeight;
	cameraOutside.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);
}

function changeCameraPosition(newCameraPosition) {
	cameraPosition = newCameraPosition;
	
	controls.enabled = (cameraPosition == 'Outside lookalike sphere');
}

function updateUniforms() {
	if(aspectRatioU > 1.0) {
		// horizontal orientation
		shaderMaterial.uniforms.tanHalfFovHU.value = Math.tan(0.5*fovU*Math.PI/180.0);
		shaderMaterial.uniforms.tanHalfFovVU.value = Math.tan(0.5*fovU*Math.PI/180.0)/aspectRatioU;
	} else {
		// vertical orientation
		shaderMaterial.uniforms.tanHalfFovHU.value = Math.tan(0.5*fovU*Math.PI/180.0)*aspectRatio;
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

/*
function changeCameraDistance(r) {
	controls.dispose();

	// current distance of the camera from the origin
	let r0 = Math.sqrt(cameraOutside.position.x*cameraOutside.position.x + cameraOutside.position.y*cameraOutside.position.y + cameraOutside.position.z*cameraOutside.position.z);
	
	// scale the coordinates so that the distance becomes r
	cameraOutside.position.x *= r/r0;
	cameraOutside.position.y *= r/r0;
	cameraOutside.position.z *= r/r0;

	addOrbitControls();
}
*/

function updateTransformationMatrix() {
	//transform to theta and phi
	let beta2 = betaX*betaX + betaY*betaY + betaZ*betaZ;
	let beta, gamma, theta, phi;
	if (beta2 >=1 ){
		/*
    	let beta0 = Math.sqrt(beta2);
    	beta = 0.99; 
    	betaX *= beta/beta0;
    	betaY *= beta/beta0;
    	betaZ *= beta/beta0;
	    console.log(`Beta >= 1, scaling it to 0.99 (beta = (${betaX}, ${betaY}, ${betaZ}))`);
		*/
		setWarning(true);
		console.log(`beta (=${Math.sqrt(beta2)}) > 1`);
  	} else {
    	beta = Math.sqrt(beta2);
		gamma = 1/Math.sqrt(1-beta2);

		if (beta===0){
			theta=0
			phi=0;
		} else {
			theta = Math.asin(-betaY/beta);
			phi = Math.PI+Math.atan2(-betaX,betaZ);
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
		if(transformation === 'Lorentz') transformationMatrix.multiply(m.makeScale(1.0/gamma, 1.0/gamma, 1.0));
		// translate by beta in the direction of beta, i.e. z
		transformationMatrix.multiply(m.makeTranslation(new THREE.Vector3(0, 0, beta)));
		// rotate back to the original orientation
		transformationMatrix.multiply(m.makeRotationX(-theta));
		transformationMatrix.multiply(m.makeRotationY(-phi));

		// set the lookalike sphere's transformation matrix to the matrix we just calculated
		lookalikeSphere.matrix.copy(transformationMatrix);

		setWarning(false);
		updateUniforms();
	}
}
	
// // see https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/change_event
function onScreenOrientationChange() {
	// stop current video streams...
	videoU.srcObject.getTracks().forEach(function(track) { track.stop(); });
	videoE.srcObject.getTracks().forEach(function(track) { track.stop(); });

	// ... and re-create new ones, hopefully of the appropriate size
	createVideoFeeds();

	// screen.orientation.addEventListener("change", (event) => {
	// 	const type = event.target.type;
	// 	const angle = event.target.angle;
	// 	alert(`ScreenOrientation change: ${type}, ${angle} degrees.  New window size ${window.innerWidth} x ${window.innerHeight}.`);

	// 	// see https://developer.mozilla.org/en-US/docs/Web/API/Screen/orientation
	// 	// switch (screen.orientation.type) {
	// 	// 	case "landscape-primary":
	// 	// 		console.log("That looks good.");
	// 	// 		break;
	// 	// 	case "landscape-secondary":
	// 	// 		console.log("Mmmh… the screen is upside down!");
	// 	// 		break;
	// 	// 	case "portrait-secondary":
	// 	// 	case "portrait-primary":
	// 	// 		console.log("Mmmh… you should rotate your device to landscape");
	// 	// 		break;
	// 	// 	default:
	// 	// 		console.log("The orientation API isn't supported in this browser :(");
	// 	// 	}
			
	// });
}
	
/*
function pointForward() {
	controls.dispose();
	// controls.enabled = false;
	camera.position.x = 0.0;
	camera.position.y = 0.0;
	camera.position.z = 4.0;
	camera.lookAt(new THREE.Vector3(0,0,0));
	addOrbitControls();
	// controls.update();
	// controls.enabled = true;

	// let minPolarAngle = controls.minPolarAngle;
	// let maxPolarAngle = controls.maxPolarAngle;
	// let minAzimuthalAngle = controls.minAzimuthalAngle;
	// let maxAzimuthalAngle = controls.maxAzimuthalAngle;

	// controls.minPolarAngle = controls.maxPolarAngle = 0.5*Math.PI; 
	// controls.minAzimuthalAngle = controls.maxAzimuthalAngle = 0.0;
	// controls.update();

	// controls.minPolarAngle = minPolarAngle;
	// controls.maxPolarAngle = maxPolarAngle;
	// controls.minAzimuthalAngle = minAzimuthalAngle;
	// controls.maxAzimuthalAngle = maxAzimuthalAngle;

	// controls.position.set
}
*/