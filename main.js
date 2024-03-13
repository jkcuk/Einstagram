// This code is based on three.js, which comes with the following license:
//
// The MIT License
//
// Copyright © 2010-2024 three.js authors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let cameraPosition = 'Inside lookalike sphere', transformation = 'Lorentz', scene;
let aspectRatioU = 4.0/3.0, aspectRatioE = 4.0/3.0;
let renderer, videoU, videoE;
let camera;	// , cameraInside, cameraOutside;
let controls, shaderMaterial, geometry, 
	lookalikeSphere, // transformationMatrix, 
	circles = new THREE.Group();	// redCircle, greenCircle, blueCircle;
	
// Nokia HR20, according to https://www.camerafv5.com/devices/manufacturers/hmd_global/nokia_xr20_ttg_0/
let fovU = 67.3;
let fovE = 68.3;
let fovS = 68;

// the Cartesian components of the boost, in units of c
// ()
let betaX = 0, betaY = 0, betaZ = 0;

// device orientation
// let deviceAlpha = 0, deviceBeta = 90, deviceGamma = 0;

// boost orientation
// let boostAlpha = 0, boostBeta = 90, boostGamma = 0;

let cameraOutsideDistance = 4.0;
let cameraAnimationStartDistance;
let cameraAnimationTargetDistance;
let cameraAnimationStartTime;
let cameraAnimationTargetTime;
let cameraAnimation = false;

let info = document.createElement('div');
let infotime;	// the time the last info was posted

let gui;

let showingStoredPhoto;

let storedPhoto;

// from https://github.com/4nt0nio/jpegcam
const click = new Audio('./shutter.mp3');

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
	camera = new THREE.PerspectiveCamera( fovS, windowAspectRatio, 0.00001, 10 );
	camera.position.z = 0.01;
	// cameraInside = new THREE.PerspectiveCamera( fovS, windowAspectRatio, 0.00001, 2.1 );
	// cameraOutside = new THREE.PerspectiveCamera( fovS, windowAspectRatio, 0.001, 10 );
	// cameraOutside.position.z = cameraOutsideDistance;
	screenChanged();
	
	renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
	// renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );
	// document.getElementById('livePhoto').appendChild( renderer.domElement );

	createVideoFeeds();

	addLookalikeSphere();

	addCircles();

	// user interface

	// handle device orientation
	// window.addEventListener("deviceorientation", handleOrientation, true);

	// handle window resize
	window.addEventListener("resize", onWindowResize, false);

	// share button functionality
	document.getElementById('takePhotoButton').addEventListener('click', takePhoto);

	// toggle fullscreen button functionality
	document.getElementById('fullscreenButton').addEventListener('click', toggleFullscreen);

	// changePositionButton
	// document.getElementById('changePositionButton').addEventListener('click', changePosition);

	// back button functionality
	document.getElementById('backButton').addEventListener('click', showLivePhoto);
	document.getElementById('backButton').style.visibility = "hidden";

	// share button
	document.getElementById('shareButton').addEventListener('click', share);
	document.getElementById('shareButton').style.visibility = "hidden";

	// delete button
	document.getElementById('deleteButton').addEventListener('click', deleteStoredPhoto);
	document.getElementById('deleteButton').style.visibility = "hidden";

	// hide the thumbnail for the moment
	document.getElementById('storedPhotoThumbnail').addEventListener('click', showStoredPhoto);
	document.getElementById('storedPhotoThumbnail').style.visibility = "hidden";
	document.getElementById('storedPhoto').addEventListener('click', showLivePhoto);
	document.getElementById('storedPhoto').style.visibility = "hidden";
	showingStoredPhoto = false;

	// handle screen-orientation (landscape/portrait) change
	screen.orientation.addEventListener("change", recreateVideoFeeds);

	// add orbit controls to outside camera
	addOrbitControls();	// add to outside camera

	// remove the splash
	let duration=2000;	// duration of transition, in ms
	
	for(let ms=0; ms<duration; ms+=20) {
		let opacity =  0.5+0.5*Math.cos(Math.PI*ms/duration);
		setTimeout(() => {  
			document.getElementById('splash').style.opacity = opacity; 
			renderer.domElement.style.opacity = 1-opacity;
		}, ms);
	}
	
	setTimeout(() => {  
		document.getElementById('splash').style.visibility = "hidden"; 
		// the controls menu
		createGUI();
	}, duration+100);
	
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
	info.style.zIndex = 1;
	document.body.appendChild(info);	
}

function setInfo(text) {
	info.innerHTML = text;
	console.log(text);

	// show the text only for 3 seconds
	infotime = new Date().getTime();
	setTimeout( () => { if(new Date().getTime() - infotime > 2999) info.innerHTML = `Einstagram, University of Glasgow, <a href="https://github.com/jkcuk/Einstagram">https://github.com/jkcuk/Einstagram</a>` }, 3000);
}

// function showInfo() {
// 	if(new Date().getTime() - infotime < 1000) info.innerHTML = infotext;
// 	else info.innerHTML =  `Einstagram, University of Glasgow`;
// 	// else info.innerHTML =  `Einstagram, University of Glasgow, ${transformation} transformation, &beta; = (${betaX}, ${betaY}, ${betaZ}), screen horiz. FOV = ${fovS}&deg;, ${cameraPosition}`;
// }

function setWarning(warning) {
	shaderMaterial.uniforms.warning.value = warning;
}

function animate() {
	requestAnimationFrame( animate );

	// calculate the matrix that describes the correct distortion of the lookalike sphere
	updateTransformationMatrix();
	
	if(!showingStoredPhoto) {
		if(cameraAnimation) {
			let t = Date.now();
			let r;
			if(t > cameraAnimationTargetTime) {
				// animation is finished
				r = cameraAnimationTargetDistance;
				cameraAnimation = false;
			} else {
				// we are mid-animation
				// f ranges from 0 (at the start of the animation) to 1 (at the end)
				let f = (t-cameraAnimationStartTime)/(cameraAnimationTargetTime-cameraAnimationStartTime);
				// c also ranges from 0 to 1, but "eases" in and out
				let c = 0.5-0.5*Math.cos(Math.PI*f);
				r = cameraAnimationStartDistance + 
					c*(cameraAnimationTargetDistance - cameraAnimationStartDistance);
			}
			camera.position.setLength(r);
			camera.updateProjectionMatrix();

			// allowing control of the distance can result in the view being no longer 
			// centred on the origin, so don't allow it
			controls.minDistance = r;
			controls.maxDistance = r;
		}

		renderer.render( scene,  camera );
		/*
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
		*/
	}

	// draw here the saved photo
	// if(photo) {
	// 	const context = renderer.domElement.getContext( '2d' );
	// 	context.drawImage( photo, 100, 100 );
	// }
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
function addLookalikeSphere() {
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
	// transformationMatrix = new THREE.Matrix4();
	// transformationMatrix.identity();
}

function addCircles() {
	let blueCircle = createCircle(0x444444);
	blueCircle.matrixAutoUpdate = false;
	// scene.add( blueCircle );

	let redCircle = createCircle(0xaaaaaa);
	redCircle.rotation.x = Math.PI / 2;
	// redCircle.matrixAutoUpdate = false;
	// scene.add( redCircle );

	let greenCircle = createCircle(0xaaaaaa);
	greenCircle.rotation.y = Math.PI / 2;
	// greenCircle.matrixAutoUpdate = false;
	// scene.add( greenCircle );

	circles.add( redCircle );
	circles.add( greenCircle );
	circles.add( blueCircle );
	circles.matrixAutoUpdate = false;
	circles.visible = false;
	scene.add(circles);
}

/** 
 * example: scene.add(createCircle(1, 0x0000ff)); // add a blue circle of radius 1 
 */
function createCircle(lineColor) {
	let geometry = new THREE.BufferGeometry();	// new THREE.RingGeometry( 1.2, 1.2, 100, 1, 0, 2*Math.PI ); 
	let lineMaterial = new THREE.LineBasicMaterial( { color: lineColor } );
	const vertices = [];
	var segments = 100;
	for (let i = 0; i <= segments; i++) {
		const theta = (i / segments) * Math.PI * 2;
		const x = Math.cos(theta);
		const y = Math.sin(theta);
		vertices.push(x, y, 0);
	}
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
return new THREE.Line(geometry, lineMaterial);
}
// const axesHelper = new THREE.AxesHelper( 5 );
// scene.add( axesHelper );

function addOrbitControls() {
	// controls

	controls = new OrbitControls( camera, renderer.domElement );
	// controls = new OrbitControls( cameraOutside, renderer.domElement );
	controls.listenToKeyEvents( window ); // optional

	//controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)

	controls.enableDamping = false; // an animation loop is required when either damping or auto-rotation are enabled
	controls.dampingFactor = 0.05;

	controls.enablePan = false;
	controls.enableZoom = false;

	// allowing control of the distance can result in the view being no longer 
	// centred on the origin, so don't allow it
	// controls.minDistance = cameraOutsideDistance;
	// controls.maxDistance = cameraOutsideDistance;

	controls.maxPolarAngle = Math.PI;
}

// see https://github.com/mrdoob/three.js/blob/master/examples/webgl_animation_skinning_additive_blending.html
function createGUI() {
	// const 
	gui = new GUI();

	const params = {
		'Camera position': cameraPosition,
		'Transformation': transformation,
		'Toggle fullscreen': toggleFullscreen,
		'Share image': share,
		'&beta;<sub>x</sub>': betaX,
		'&beta;<sub>y</sub>': betaY,
		'&beta;<sub>z</sub>': betaZ,
		'FOV user-facing camera': fovU,
		'FOV env.-facing camera': fovE,
		'FOV screen': fovS,
		'Forward': pointForward,
		'Backward': pointBackward,
		'Towards <b>&beta;</b>': pointBeta,
		'Towards -<b>&beta;</b>': pointMinusBeta,
		'Towards <b>&beta;</b> + 90&deg;': pointBetaPlus90,
		'Towards <b>&beta;</b> - 90&deg;': pointBetaMinus90,
		'Toggle show circles': function() { circles.visible = !circles.visible; },
		'Restart video streams': function() { 
			recreateVideoFeeds(); 
			setInfo("Restarting video streams");
		}
	}

	gui.add(params, 'Camera position', { 'Inside lookalike sphere': 'Inside lookalike sphere', 'Outside lookalike sphere': 'Outside lookalike sphere' } ).onChange( changeCamera );
	gui.add(params, 'Transformation', { 'Lorentz': 'Lorentz', 'Galileo': 'Galileo' } ).onChange( (s) => { transformation = s; console.log(s); });

	const folderBeta = gui.addFolder( 'Boost <b>&beta;</b> = <b>v<b><sub>camera</sub>/<i>c</i>' );
	folderBeta.add( params, '&beta;<sub>x</sub>', -0.99, 0.99, 0.01).onChange( (value) => { betaX = value; updateTransformationMatrix(); setInfo( `&beta; = ${Math.sqrt(betaX*betaX + betaY*betaY + betaZ*betaZ)}`); })
	folderBeta.add( params, '&beta;<sub>y</sub>', -0.99, 0.99, 0.01).onChange( (value) => { betaY = value; updateTransformationMatrix(); setInfo( `&beta; = ${Math.sqrt(betaX*betaX + betaY*betaY + betaZ*betaZ)}`); })
	folderBeta.add( params, '&beta;<sub>z</sub>', -0.99, 0.99, 0.01).onChange( (value) => { betaZ = value; updateTransformationMatrix(); setInfo( `&beta; = ${Math.sqrt(betaX*betaX + betaY*betaY + betaZ*betaZ)}`); })

	const folderPoint = gui.addFolder( 'Point camera' );
	folderPoint.add( params, 'Forward');
	folderPoint.add( params, 'Backward');
	folderPoint.add( params, 'Towards <b>&beta;</b>');
	folderPoint.add( params, 'Towards -<b>&beta;</b>' );
	folderPoint.add( params, 'Towards <b>&beta;</b> + 90&deg;' );
	folderPoint.add( params, 'Towards <b>&beta;</b> - 90&deg;' );
	
	const folderSettings = gui.addFolder( 'Controls' );
	// folderSettings.add( params, 'Toggle show circles');
	folderSettings.add( params, 'FOV user-facing camera', 10, 170, 1).onChange( (fov) => { fovU = fov; updateUniforms(); });   
	folderSettings.add( params, 'FOV env.-facing camera', 10, 170, 1).onChange( (fov) => { fovE = fov; updateUniforms(); });   
	folderSettings.add( params, 'FOV screen', 10, 170, 1).onChange( setScreenFOV );   
	folderSettings.add( params, 'Restart video streams');
	folderSettings.close();

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
	camera.aspect = windowAspectRatio;
	//cameraInside.aspect = windowAspectRatio;
	//cameraOutside.aspect = windowAspectRatio;

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
	camera.fov = verticalFOV;
	//cameraOutside.fov = verticalFOV;
	//cameraInside.fov = verticalFOV;

	// make sure the camera changes take effect
	camera.updateProjectionMatrix();
	//cameraOutside.updateProjectionMatrix();
	//cameraInside.updateProjectionMatrix();
}

function onWindowResize() {
	screenChanged();
	setInfo(`window size ${window.innerWidth} &times; ${window.innerHeight}`);	// debug
}

// function changePosition() {
function changeCamera(newCameraPosition) {
	// change the camera position
	cameraPosition = newCameraPosition;
	// switch(cameraPosition) {
	// 	case 'Outside lookalike sphere':
	// 		cameraPosition = 'Inside lookalike sphere';
	// 		cameraAnimationTargetDistance = 0.000001;
	// 		break;
	// 	case 'Inside lookalike sphere':
	// 	default:
	// 		cameraPosition = 'Outside lookalike sphere';
	// 		cameraAnimationTargetDistance = cameraOutsideDistance;
	// }
	switch(cameraPosition) {
		case 'Outside lookalike sphere':
			cameraAnimationTargetDistance = cameraOutsideDistance;
			break;
		case 'Inside lookalike sphere':
		default:
			cameraAnimationTargetDistance = 0.000001;
	}
	cameraAnimationStartDistance = camera.position.length();
	cameraAnimationStartTime = Date.now();
	cameraAnimationTargetTime = cameraAnimationStartTime + 2000;
	setInfo('Moving camera to position '+cameraPosition);

	cameraAnimation = true;
	// controls.enabled = (cameraPosition == 'Outside lookalike sphere');
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
			phi = Math.PI+Math.atan2(-betaX,-betaZ);
			// setInfo(`(&theta;, &phi;) = (${theta.toFixed(2)}, ${phi.toFixed(2)})`);
		}

		// re-calculate the transformation matrix
		let m = new THREE.Matrix4();	
		// start from the identity matrix
		let transformationMatrix1 = new THREE.Matrix4();
		transformationMatrix1.makeRotationY(phi);	// identity();	
		// rotate the beta direction into the z direction
		// transformationMatrix1.multiply(m.makeRotationY(phi));
		transformationMatrix1.multiply(m.makeRotationX(theta));
		// translate by beta in the direction of beta, i.e. z
		transformationMatrix1.multiply(m.makeTranslation(new THREE.Vector3(0, 0, beta)));
		// scale by 1/gamma in the directions perpendicular to beta, i.e. x and y, 
		// if the Lorentz transformation is chosen
		if(transformation === 'Lorentz') transformationMatrix1.multiply(m.makeScale(oneOverGamma, oneOverGamma, 1.0));

		let transformationMatrix2 = new THREE.Matrix4();
			// rotate back to the original orientation
		transformationMatrix2.makeRotationX(-theta);
		transformationMatrix2.multiply(m.makeRotationY(-phi));

		// rotate the lookalike sphere according to the device orientation
		// see https://developer.mozilla.org/en-US/docs/Web/API/Device_orientation_events/Using_device_orientation_with_3D_transforms
		// transformationMatrix.multiply(m.makeRotationZ(deviceAlpha*Math.PI/180));
		// transformationMatrix.multiply(m.makeRotationX(-deviceBeta*Math.PI/180));
		// transformationMatrix.multiply(m.makeRotationY(deviceGamma*Math.PI/180));

		circles.matrix.copy(transformationMatrix1);
		// greenCircle.matrix.copy(transformationMatrix1);
		// blueCircle.matrix.copy(transformationMatrix1);

		// set the lookalike sphere's transformation matrix to the matrix we just calculated
		transformationMatrix1.multiply(transformationMatrix2);
		lookalikeSphere.matrix.copy(transformationMatrix1);

		if(shaderMaterial.uniforms.warning.value) {
			setWarning(false);
			setInfo(`&beta; < 1; all good!`);
		}
	}
}
	
// // see https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/change_event
function recreateVideoFeeds() {
	// stop current video streams...
	videoU.srcObject.getTracks().forEach(function(track) { track.stop(); });
	videoE.srcObject.getTracks().forEach(function(track) { track.stop(); });

	// ... and re-create new ones, hopefully of the appropriate size
	createVideoFeeds();
}

function  pointForward() {
	let r = camera.position.length();
	camera.position.x = 0;
	camera.position.y = 0;
	camera.position.z = r;
	controls.update();
	// camera.updateProjectionMatrix();
}

function  pointBackward() {
	let r = camera.position.length();
	camera.position.x = 0;
	camera.position.y = 0;
	camera.position.z = -r;
	controls.update();
}

function pointBeta() {
	let beta2 = betaX*betaX + betaY*betaY + betaZ*betaZ;
	if(beta2 > 0) {
		let beta = new THREE.Vector3(betaX, betaY, betaZ).setLength(camera.position.length());
		camera.position.copy(beta.multiplyScalar(-1));	// look from (-beta) at the origin, so in the direction of +beta
		controls.update();
	} else {
		setInfo( '&beta; = 0, so there is no direction <b>&beta;</b>!' );
	}
	// let r = camera.position.length();
	// let beta = Math.sqrt(betaX*betaX + betaY*betaY + betaZ*betaZ);
	// if(beta > 0) {
	// 	camera.position.x = -r*betaX/beta;
	// 	camera.position.y = -r*betaY/beta;
	// 	camera.position.z = -r*betaZ/beta;
	// 	controls.update();
	// }
}

function pointMinusBeta() {
	let beta2 = betaX*betaX + betaY*betaY + betaZ*betaZ;
	if(beta2 > 0) {
		let beta = new THREE.Vector3(betaX, betaY, betaZ).setLength(camera.position.length());
		camera.position.copy(beta);	// look from beta at the origin, so in the direction of -beta
		controls.update();
		setInfo('pointing camera to -<b>&beta;</b>');
	} else {
		setInfo( '&beta; = 0, so there is no direction <b>&beta;</b>!' );
	}
}

function pointBetaPlus90() {
	let beta2 = betaX*betaX + betaY*betaY + betaZ*betaZ;
	if(beta2 > 0) {
		let beta = new THREE.Vector3(betaX, betaY, betaZ).setLength(camera.position.length());
		beta.applyAxisAngle ( new THREE.Vector3(0, 1, 0), 0.5*Math.PI );
		camera.position.copy(beta);
		controls.update();
	} else {
		setInfo( '&beta; = 0, so there is no direction <b>&beta;</b>!' );
	}
}

function pointBetaMinus90() {
	let beta2 = betaX*betaX + betaY*betaY + betaZ*betaZ;
	if(beta2 > 0) {
		let beta = new THREE.Vector3(betaX, betaY, betaZ).setLength(camera.position.length());
		beta.applyAxisAngle ( new THREE.Vector3(0, 1, 0), -0.5*Math.PI );
		camera.position.copy(beta);
		controls.update();
	} else {
		setInfo( '&beta; = 0, so there is no direction <b>&beta;</b>!' );
	}
}

async function toggleFullscreen() {
	if (!document.fullscreenElement) {
		document.documentElement.requestFullscreen().catch((err) => {
			setInfo(
				`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`,
			);
		});
		// allow screen orientation changes
		// screen.orientation.unlock();
	} else {
		document.exitFullscreen();
	}
}

function showStoredPhoto() {
	gui.hide();
	renderer.domElement.style.visibility = "hidden";
	document.getElementById('takePhotoButton').style.visibility = "hidden";
	// document.getElementById('changePositionButton').style.visibility = "hidden";
	document.getElementById('storedPhotoThumbnail').style.visibility = "hidden";
	document.getElementById('backButton').style.visibility = "visible";
	document.getElementById('shareButton').style.visibility = "visible";
	document.getElementById('deleteButton').style.visibility = "visible";
	document.getElementById('storedPhoto').style.visibility = "visible";
	showingStoredPhoto = true;

	setInfo('Showing stored photo');
}

function showLivePhoto() {
	gui.show();
	renderer.domElement.style.visibility = "visible";
	document.getElementById('takePhotoButton').style.visibility = "visible";
	// document.getElementById('changePositionButton').style.visibility = "visible";
	if(storedPhoto) document.getElementById('storedPhotoThumbnail').style.visibility = "visible";
	document.getElementById('backButton').style.visibility = "hidden";
	document.getElementById('shareButton').style.visibility = "hidden";
	document.getElementById('deleteButton').style.visibility = "hidden";
	document.getElementById('storedPhoto').style.visibility = "hidden";
	showingStoredPhoto = false;

	setInfo('Showing live image');
}

function deleteStoredPhoto() {
	storedPhoto = null;

	showLivePhoto();

	setInfo('Stored photo deleted; showing live image');
}

function takePhoto() {
	try {
		click.play();

		storedPhoto = renderer.domElement.toDataURL('image/png');

		// 
		document.getElementById('storedPhoto').src=storedPhoto;
		document.getElementById('storedPhotoThumbnail').src=storedPhoto;
		document.getElementById('storedPhotoThumbnail').style.visibility = "visible";
	
		setInfo('Photo taken; click thumbnail to view and share');
	} catch (error) {
		console.error('Error:', error);
	}	
}

async function share() {
	try {
		fetch(storedPhoto)
		.then(response => response.blob())
		.then(blob => {
			const file = new File([blob], `Einstagram beta=(${betaX.toFixed(2)},${betaY.toFixed(2)},${betaZ.toFixed(2)}).png`, { type: blob.type });

			// Use the Web Share API to share the screenshot
			if (navigator.share) {
				navigator.share({
					title: `Einstagram beta=(${betaX.toFixed(2)},${betaY.toFixed(2)},${betaZ.toFixed(2)})`,
					// text: 'Check out this image rendered using Einstagram (https://jkcuk.github.io/Einstagram/)!',
					files: [file],
				});
			} else {
				setInfo('Sharing is not supported by this browser.');
			}	
		})
		.catch(error => {
			console.error('Error:', error);
			setInfo(`Error: ${error}`);
		});
	} catch (error) {
		console.error('Error:', error);
	}
}