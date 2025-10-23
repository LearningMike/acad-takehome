import * as THREE from "three";
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const init = () => {
	
	//viewport
	const canvas = document.getElementById("viewport");
	const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: false, premultipliedAlpha: false, precision: 'highp', powerPreference: 'low-power'});
	renderer.setPixelRatio(1.0);
	renderer.setSize(canvas.clientWidth, canvas.clientHeight);
	
	//camera
	const fov = 45;
	const aspect = window.innerWidth / window.innerHeight;
	const near = 0.1;
	const far = 100;
	const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
	camera.position.y = 2;
	
	//camera orbital controls
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.target.set(0, 0, 0);
	controls.rotateSpeed *= -0.4;
	controls.autoRotate = false;
	controls.enableDamping = true;
	controls.enableZoom = true;
	controls.maxDistance = 2;
	controls.minDistance = 0.5;
	controls.maxPolarAngle = Math.PI-1.7;
	controls.minPolarAngle = 0;
	controls.update();
	
	//scene
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0xEEEEEE);
	scene.add(camera);
	
	const backlight = new THREE.HemisphereLight(0xB1E1FF, 0xAA7700, 1);
	scene.add(backlight);
	const light = new THREE.DirectionalLight(0xFFFFFF, 1.4);
	light.position.set(2, 10, 2);
	light.target.position.set(0, 0, 0);
	scene.add(light);
	scene.add(light.target);
	
	let buildMode = false;
	let points = [];
	let gizmos = new THREE.Object3D();
	let height = 0.2;
	
	document.getElementById("buildmode").addEventListener('click', (event) => {
		if (!buildMode){
			buildMode = true;
			document.getElementById("viewport").style.cursor = "crosshair";
			document.getElementById("buildmode").style.backgroundColor = "#FFAA0099";
			//clear old points and gizmos
			points = [];
			line.geometry = new THREE.BufferGeometry().setFromPoints(points);
			gizmos.clear();
		} else {
			buildMode = false;
			document.getElementById("viewport").style.cursor  = "grab";
			document.getElementById("buildmode").style.backgroundColor = "#FFFFFFFF";
			//get height and build geometry
			let constructedGeometry = [];
			let constructedIndices = [];
			for(let i=0; i<points.length; i++){
				let wallplane = [];
				//building a wall for each point
				if (i < points.length-1){
					wallplane = [
						points[i].x, points[i].y, points[i].z,
						points[i+1].x, points[i+1].y, points[i+1].z,
						points[i+1].x, points[i+1].y+height, points[i+1].z,
						points[i].x, points[i].y+height, points[i].z,
					]
				} else if (i == points.length-1){
					wallplane = [
						points[i].x, points[i].y, points[i].z,
						points[0].x, points[0].y, points[0].z,
						points[0].x, points[0].y+height, points[0].z,
						points[i].x, points[i].y+height, points[i].z,
					]
				}
				let indices = [
					(i*4), (i*4)+1, (i*4)+2,
					(i*4)+2, (i*4)+3, (i*4),
				];
				constructedGeometry = constructedGeometry.concat(wallplane);
				constructedIndices = constructedIndices.concat(indices);
			}
			
			const bufferGeometry = new THREE.BufferGeometry();
			const bufferVertices = new Float32Array(constructedGeometry);
			
			console.log(constructedGeometry);
			console.log(constructedIndices);
			bufferGeometry.setIndex(constructedIndices);
			bufferGeometry.setAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));

			const bufferMaterial = new THREE.MeshLambertMaterial({color: 0xEEEEEE, flatShading: true, side:THREE.DoubleSide});
			const model = new THREE.Mesh(bufferGeometry, bufferMaterial);
			scene.add(model);
		}
	});
	scene.add(gizmos);
	
	//image and plane
	const request = "https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/-122.477098046626,37.81059898565757,19/1024x1024?access_token=pk.eyJ1Ijoibmlja2ZpdHoiLCJhIjoiY2p3d2g3N2F5MDZ4azQwcG12dWticDB0diJ9.qnQV5QgYN_eDwg4uUdbO6Q";
	
	let plane;
	fetch(request).then(response => response.blob()).then(imageBlob => {
		console.log("image retrieved");
		const imageURL = URL.createObjectURL(imageBlob);
		const loader = new THREE.TextureLoader();
		const texture = loader.load(imageURL);
		texture.colorSpace = THREE.SRGBColorSpace;
		
		const planeGeometry = new THREE.PlaneGeometry(1, 1);
		planeGeometry.rotateX(Math.PI/2);
		const planeMaterial = new THREE.MeshBasicMaterial({color: 0xFFFFFF, side: THREE.DoubleSide, map: texture});
		plane = new THREE.Mesh(planeGeometry, planeMaterial);
		scene.add(plane);
	});
	
	//cursor and raycaster
	const mouse = new THREE.Vector2();
	const raycaster = new THREE.Raycaster();
	
	const lineMaterial = new THREE.LineBasicMaterial({ color: 0xFFAA00});
	const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
	const line = new THREE.Line(lineGeometry, lineMaterial);
	scene.add(line);
	
	const onPointerMove = (event) => {
		mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
	}
	
	const onPointerUp = (event) => {
		if (buildMode) {
			raycaster.setFromCamera(mouse, camera);
			const intersects = raycaster.intersectObject(plane);
			if (intersects.length > 0) {
				const coordinate = intersects[0].point;
				
				//sphere gizmos
				let gizmoMaterial = new THREE.MeshBasicMaterial({color: 0xFFAA00});
				const gizmoGeometry = new THREE.SphereGeometry(1, 32, 8);
				let gizmoSphere = new THREE.Mesh(gizmoGeometry, gizmoMaterial);
				gizmoSphere.scale.set(0.005, 0.005, 0.005);
				gizmoSphere.position.set(coordinate.x, coordinate.y, coordinate.z);
				gizmos.add(gizmoSphere);
				
				//line gizmos
				points.push(new THREE.Vector3(coordinate.x, coordinate.y+0.001, coordinate.z));
				let baseGeometry = JSON.parse(JSON.stringify(points));
				baseGeometry.push(new THREE.Vector3(points[0].x, points[0].y, points[0].z));
				line.geometry = new THREE.BufferGeometry().setFromPoints(baseGeometry);
			}
		}
	}
	
	const onWindowResize = () => {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		
		renderer.setSize(canvas.clientWidth, canvas.clientHeight);
	}
	
	let renderframe = (milliseconds) => {
		renderer.render(scene, camera);
	}
	renderer.setAnimationLoop(renderframe);
	window.addEventListener('pointermove', onPointerMove);
	window.addEventListener('click', onPointerUp);
	window.addEventListener('resize', onWindowResize);
}

init();