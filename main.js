// import * as THREE from './three'; 
import * as THREE from 'https://github.com/mrdoob/three.js/blob/master/build/three.module.js';

import { GUI } from './three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from './three/addons/controls/OrbitControls.js';


let cameraInside, cameraOutside, cameraPosition = 'Inside lookalike sphere', transformation = 'Lorentz', scene, renderer, videoU, videoE, controls, shaderMaterial, geometry, lookalikeSphere, transformationMatrix;

let fovU = 67;
let fovE = 90;
let fovS = 50;

let betaX = 0.0, betaY = 0.0, betaZ = 0.0;

init();
animate();

function init() {

	scene = new THREE.Scene();
	cameraInside = new THREE.PerspectiveCamera( fovS, window.innerWidth / window.innerHeight, 0.0001, 3 );
	cameraOutside = new THREE.PerspectiveCamera( fovS, window.innerWidth / window.innerHeight, 0.0001, 10 );
	cameraOutside.position.z = 4;

	renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	addOrbitControls();	// add to outside camera

	videoU = document.getElementById( 'videoU' );
	videoE = document.getElementById( 'videoE' );

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
			}
		`
	});
	lookalikeSphere = new THREE.Mesh( geometry, shaderMaterial );
	lookalikeSphere.matrixAutoUpdate = false;	// we will update the matrix ourselves
	scene.add( lookalikeSphere );

	transformationMatrix = new THREE.Matrix4();
	transformationMatrix.identity();

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


	updateTransformationMatrix();
	
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


function addOrbitControls() {
	// controls

	controls = new OrbitControls( cameraOutside, renderer.domElement );
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

	var text =
	{
    	'Camera position': cameraPosition,
		'Transformation': transformation
	}
	gui.add(text, 'Camera position', { 'Inside lookalike sphere': 'Inside lookalike sphere', 'Outside lookalike sphere': 'Outside lookalike sphere' } ).onChange( (s) => { cameraPosition = s; console.log(s); });
	gui.add(text, 'Transformation', { 'Lorentz': 'Lorentz', 'Galileo': 'Galileo' } ).onChange( (s) => { transformation = s; console.log(s); });

	const params = {
		'&beta;<sub>x</sub>': betaX,
		'&beta;<sub>y</sub>': betaY,
		'&beta;<sub>z</sub>': betaZ,
		'user-facing camera': fovU,
		'env.-facing camera': fovE,
		'screen': fovS,
		'<i>z</i> coordinate': cameraOutside.position.z,
		point_forward:function(){ pointForward(); }
	}

	const folderBeta = gui.addFolder( '&beta;' );
	folderBeta.add( params, '&beta;<sub>x</sub>', -0.99, 0.99, 0.01).onChange( (value) => { betaX = value; updateTransformationMatrix(); })
	folderBeta.add( params, '&beta;<sub>y</sub>', -0.99, 0.99, 0.01).onChange( (value) => { betaY = value; updateTransformationMatrix(); })
	folderBeta.add( params, '&beta;<sub>z</sub>', -0.99, 0.99, 0.01).onChange( (value) => { betaZ = value; updateTransformationMatrix(); })

	const folderFOV = gui.addFolder( 'FOV' );
	folderFOV.add( params, 'user-facing camera', 10, 170, 1).onChange( (fov) => { fovU = fov; updateUniforms(); });   
	folderFOV.add( params, 'env.-facing camera', 10, 170, 1).onChange( (fov) => { fovE = fov; updateUniforms(); });   
	folderFOV.add( params, 'screen', 10, 170, 1).onChange( (fov) => { fovS = fov; cameraInside.fov = fovS; cameraInside.updateProjectionMatrix(); });   
	folderFOV.open();

	/*
	const cameraFolder = gui.addFolder( 'Camera' );
	cameraFolder.add( params, '<i>z</i> coordinate', 0, 5, 0.01).onChange( changeCameraDistance );
	cameraFolder.add( params, 'point_forward');
	*/
}

function updateUniforms() {
	shaderMaterial.uniforms.tanHalfFovHU.value = Math.tan(0.5*fovU*Math.PI/180.0);
	shaderMaterial.uniforms.tanHalfFovVU.value = Math.tan(0.5*fovU*Math.PI/180.0);
	shaderMaterial.uniforms.tanHalfFovHE.value = Math.tan(0.5*fovE*Math.PI/180.0);
	shaderMaterial.uniforms.tanHalfFovVE.value = Math.tan(0.5*fovE*Math.PI/180.0);
}

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

		let m = new THREE.Matrix4();
		transformationMatrix.identity();
		transformationMatrix.multiply(m.makeRotationY(phi));
		transformationMatrix.multiply(m.makeRotationX(theta));
		if(transformation === 'Lorentz') transformationMatrix.multiply(m.makeScale(1.0/gamma, 1.0/gamma, 1.0));
		transformationMatrix.multiply(m.makeTranslation(new THREE.Vector3(0, 0, beta)));
		transformationMatrix.multiply(m.makeRotationX(-theta));
		transformationMatrix.multiply(m.makeRotationY(-phi));

		lookalikeSphere.matrix.copy(transformationMatrix);
	}
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