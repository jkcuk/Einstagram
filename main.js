import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera, scene, renderer, videoU, videoE, controls, shaderMaterial;

let fovU = 67;
let fovE = 90;
let fovS = 50;

init();
animate();

function init() {

	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera( fovS, window.innerWidth / window.innerHeight, 0.1, 1000 );

	renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );


	videoU = document.getElementById( 'videoU' );
	videoE = document.getElementById( 'videoE' );

	const textureU = new THREE.VideoTexture( videoU );
	textureU.colorSpace = THREE.SRGBColorSpace;

	const textureE = new THREE.VideoTexture( videoE );
	textureE.colorSpace = THREE.SRGBColorSpace;

	// the lookalike sphere
	const geometry = new THREE.SphereGeometry( 1, 128, 64 );
	// const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
	shaderMaterial = new THREE.ShaderMaterial({
		side: THREE.DoubleSide,
		uniforms: { 
			textureU: { value: textureU }, 
			textureE: { value: textureE },
			tanHalfFovHU: { value: 0.5*fovU*Math.PI/180.0 },
			tanHalfFovVU: { value: 1.0 },
			tanHalfFovHE: { value: 1.0 },
			tanHalfFovVE: { value: 1.0 }
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
			
			void main() {
				if(positionZ < 0.0) {
					// environment-facing camera
					if((abs(zPlaneCoord.x) < tanHalfFovHE) && (abs(zPlaneCoord.y) < tanHalfFovVE)) {
						gl_FragColor = texture2D(textureE, vec2(0.5-0.5*zPlaneCoord.x/tanHalfFovHE, 0.5-0.5*zPlaneCoord.y/tanHalfFovVE));
					} else {
						gl_FragColor = vec4(1.0);
					}
				} else {
					// user-facing camera
					if((abs(zPlaneCoord.x) < tanHalfFovHU) && (abs(zPlaneCoord.y) < tanHalfFovVU)) {
						gl_FragColor = texture2D(textureU, vec2(0.5+0.5*zPlaneCoord.x/tanHalfFovHU, 0.5+0.5*zPlaneCoord.y/tanHalfFovVU));
					} else {
						gl_FragColor = vec4(0.5);
					}
				}
			}
		`
	});
	const lookalikeSphere = new THREE.Mesh( geometry, shaderMaterial );
	scene.add( lookalikeSphere );

	camera.position.z = 4;

	addOrbitControls();

	createGUI();

	// see https://github.com/mrdoob/three.js/blob/master/examples/webgl_materials_video_webcam.html
	if ( navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {
		// user-facing camera
		const constraintsU = { video: { width: 1280, height: 720, facingMode: 'user' } };
		navigator.mediaDevices.getUserMedia( constraintsU ).then( function ( stream ) {
			// apply the stream to the video element used in the texture
			videoU.srcObject = stream;
			videoU.play();
		} ).catch( function ( error ) {
			console.error( 'Unable to access the camera/webcam.', error );
		} );

		// environment-facing camera
		const constraintsE = { video: { width: 1280, height: 720, facingMode: 'environment' } };
		navigator.mediaDevices.getUserMedia( constraintsE ).then( function ( stream ) {
			// apply the stream to the video element used in the texture
			videoE.srcObject = stream;
			videoE.play();
		} ).catch( function ( error ) {
			console.error( 'Unable to access the camera/webcam.', error );
		} );
	} else {
		console.error( 'MediaDevices interface not available.' );
	}
}

function animate() {
	// console.log(camera.position);
	requestAnimationFrame( animate );

	// cube.rotation.x += 0.01;
	// cube.rotation.y += 0.01;

	renderer.render( scene, camera );
}


function addOrbitControls() {
	// controls

	controls = new OrbitControls( camera, renderer.domElement );
	controls.listenToKeyEvents( window ); // optional

	//controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)

	controls.enableDamping = false; // an animation loop is required when either damping or auto-rotation are enabled
	controls.dampingFactor = 0.05;

	controls.screenSpacePanning = false;

	controls.minDistance = 1;
	controls.maxDistance = 20;

	controls.maxPolarAngle = Math.PI;
}

// see https://github.com/mrdoob/three.js/blob/master/examples/webgl_animation_skinning_additive_blending.html
function createGUI() {

	const gui = new GUI();

	const params = {
	  user_facing_camera: fovU,
	  environment_facing_camera: fovE,
	  screen: 150,
	  z_coordinate: camera.position.z,
	  point_forward:function(){ pointForward(); }
	}

	const folderFOV = gui.addFolder( 'FOV' );
	folderFOV.add( params, 'user_facing_camera', 10, 170, 1).onChange( (fov) => { fovU = fov; updateUniforms(); });   
	folderFOV.add( params, 'environment_facing_camera', 10, 170, 1).onChange( (fov) => { fovE = fov; updateUniforms(); });   
	folderFOV.add( params, 'screen', 10, 170, 1).onChange( (fov) => { fovS = fov; camera.fov = 0.5*fovS; camera.updateProjectionMatrix(); });   
	folderFOV.open();

	const cameraFolder = gui.addFolder( 'Camera' );
	cameraFolder.add( params, `z_coordinate`, 0, 5, 0.01).onChange( changeCameraDistance );
	cameraFolder.add( params, 'point_forward');
}

function updateUniforms() {
	shaderMaterial.uniforms.tanHalfFovHU.value = Math.tan(0.5*fovU*Math.PI/180.0);
	shaderMaterial.uniforms.tanHalfFovVU.value = Math.tan(0.5*fovU*Math.PI/180.0);
	shaderMaterial.uniforms.tanHalfFovHE.value = Math.tan(0.5*fovE*Math.PI/180.0);
	shaderMaterial.uniforms.tanHalfFovVE.value = Math.tan(0.5*fovE*Math.PI/180.0);
}

function changeCameraDistance(r) {
	controls.dispose();

	let r0 = Math.sqrt(camera.position.x*camera.position.x + camera.position.y*camera.position.y + camera.position.z*camera.position.z);
	camera.position.x *= r/r0;
	camera.position.y *= r/r0;
	camera.position.z *= r/r0;

	addOrbitControls();
}

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
	/*
	let minPolarAngle = controls.minPolarAngle;
	let maxPolarAngle = controls.maxPolarAngle;
	let minAzimuthalAngle = controls.minAzimuthalAngle;
	let maxAzimuthalAngle = controls.maxAzimuthalAngle;

	controls.minPolarAngle = controls.maxPolarAngle = 0.5*Math.PI; 
	controls.minAzimuthalAngle = controls.maxAzimuthalAngle = 0.0;
	controls.update();

	controls.minPolarAngle = minPolarAngle;
	controls.maxPolarAngle = maxPolarAngle;
	controls.minAzimuthalAngle = minAzimuthalAngle;
	controls.maxAzimuthalAngle = maxAzimuthalAngle;

	controls.position.set
	*/
}