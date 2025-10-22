import * as THREE from "three";
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

let buildMode = false;
let points = [];
document.getElementById("buildmode").addEventListener('click', (event) => {
	if (!buildMode){
		buildMode = true;
		document.getElementById("viewport").style.cursor = "crosshair";
		document.getElementById("buildmode").style.backgroundColor = "#FFAA00";
		points = [];
	} else {
		buildMode = false;
		document.getElementById("viewport").style.cursor  = "grab";
		document.getElementById("buildmode").style.backgroundColor = "#FFFFFF";
	}
});

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
	controls.maxPolarAngle = Math.PI-1.7;
	controls.minPolarAngle = 0;
	controls.update();
	
	//scene
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0xAAAAAA);
	scene.add(camera);
	
	//image and plane
	const request = "https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/-122.477098046626,37.81059898565757,19/1024x1024?access_token=pk.eyJ1Ijoibmlja2ZpdHoiLCJhIjoiY2p3d2g3N2F5MDZ4azQwcG12dWticDB0diJ9.qnQV5QgYN_eDwg4uUdbO6Q";
	
	let model;
	fetch(request).then(response => response.blob()).then(imageBlob => {
		console.log("image retrieved");
		const imageURL = URL.createObjectURL(imageBlob);
		const loader = new THREE.TextureLoader();
		const texture = loader.load(imageURL);
		texture.colorSpace = THREE.SRGBColorSpace;
		
		const planeGeometry = new THREE.PlaneGeometry(1, 1);
		planeGeometry.rotateX(Math.PI/2);
		const planeMaterial = new THREE.MeshBasicMaterial({color: 0xFFFFFF, side: THREE.DoubleSide, map: texture});
		model = new THREE.Mesh(planeGeometry, planeMaterial);
		scene.add(model);
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
			const intersects = raycaster.intersectObject(model);
			if (intersects.length > 0) {
				const coordinate = intersects[0].point;
				
				console.log("position on plane:", coordinate);
				
				//sphere gizmos
				let gizmoMaterial = new THREE.MeshBasicMaterial({color: 0xFFAA00});
				const gizmoGeometry = new THREE.SphereGeometry(1, 32, 8);
				let gizmoSphere = new THREE.Mesh(gizmoGeometry, gizmoMaterial);
				gizmoSphere.scale.set(0.005, 0.005, 0.005);
				gizmoSphere.position.set(coordinate.x, coordinate.y, coordinate.z);
				scene.add(gizmoSphere);
				
				//line gizmos
				points.push(new THREE.Vector3(coordinate.x, coordinate.y+0.001, coordinate.z));
				let baseGeometry = JSON.parse(JSON.stringify(points));
				baseGeometry.push(new THREE.Vector3(points[0].x, points[0].y, points[0].z));
				const newGeometry = new THREE.BufferGeometry().setFromPoints(baseGeometry);
				line.geometry = newGeometry;
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