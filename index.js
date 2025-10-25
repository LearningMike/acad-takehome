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
	controls.enablePan = false;
	controls.maxDistance = 2;
	controls.minDistance = 0.5;
	controls.maxPolarAngle = Math.PI-1.7;
	controls.minPolarAngle = 0;
	controls.update();
	
	//scene
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0xCCCCCC);
	scene.add(camera);
	
	const backlight = new THREE.HemisphereLight(0xB1E1FF, 0xAA7700, 1);
	scene.add(backlight);
	const light = new THREE.DirectionalLight(0xFFFFFF, 2);
	light.position.set(2, 10, 2);
	light.target.position.set(0, 0, 0);
	scene.add(light);
	scene.add(light.target);
	
	let buildMode = false;
	let heightSet = false;
	let points = [];
	let newpoints = false;
	let gizmos = new THREE.Object3D();
	let height = 1;
	let models = new THREE.Object3D();
	let model = new THREE.Object3D();
	let texture;
	let userInputHeight = parseFloat(document.getElementById("heightinput").value);
	
	const createModel = () => {
		let constructedGeometry = [];
		let constructedIndices = [];
		let roofIndices = [];
		let constructedUVs = [];
		
		//building a wall for each point
		for(let i=0; i<points.length; i++){
			let wallplane = [];
			let uv = [];
			if (i < points.length-1){
				wallplane = [
					points[i].x, points[i].y, points[i].z,
					points[i+1].x, points[i+1].y, points[i+1].z,
					points[i+1].x, points[i+1].y+height, points[i+1].z,
					points[i].x, points[i].y+height, points[i].z,
				]
				uv = [
					points[i].x+0.5, Math.abs(points[i].z-0.5),
					points[i+1].x+0.5, Math.abs(points[i+1].z-0.5),
					points[i+1].x+0.5, Math.abs(points[i+1].z-0.5),
					points[i].x+0.5, Math.abs(points[i].z-0.5),
				]
			} else if (i == points.length-1){
				wallplane = [
					points[i].x, points[i].y, points[i].z,
					points[0].x, points[0].y, points[0].z,
					points[0].x, points[0].y+height, points[0].z,
					points[i].x, points[i].y+height, points[i].z,
				]
				uv = [
					points[i].x+0.5, Math.abs(points[i].z-0.5),
					points[0].x+0.5, Math.abs(points[0].z-0.5),
					points[0].x+0.5, Math.abs(points[0].z-0.5),
					points[i].x+0.5, Math.abs(points[i].z-0.5),
				]
			}
			let indices = [
				(i*4), (i*4)+1, (i*4)+2,
				(i*4)+2, (i*4)+3, (i*4),
			];
			constructedGeometry = constructedGeometry.concat(wallplane);
			constructedIndices = constructedIndices.concat(indices);
			roofIndices = roofIndices.concat([(i*4)+3]);
			constructedUVs = constructedUVs.concat(uv);
		}
		
		//roofing with indices (brute covering for now) does not work for concave polygons
		for(let i=2; i<roofIndices.length; i++){
			constructedIndices = constructedIndices.concat([roofIndices[0], roofIndices[i-1], roofIndices[i]]);
		}
		
		const bufferGeometry = new THREE.BufferGeometry();
		const bufferVertices = new Float32Array(constructedGeometry);
		const bufferUVs = new Float32Array(constructedUVs);
		
		bufferGeometry.setIndex(constructedIndices);
		bufferGeometry.setAttribute('position', new THREE.BufferAttribute(bufferVertices, 3));
		bufferGeometry.setAttribute('uv', new THREE.BufferAttribute(bufferUVs, 2));
		
		const bufferMaterial = new THREE.MeshLambertMaterial({color: 0xEEEEEE, flatShading: true, side:THREE.DoubleSide, map: texture});
		model = new THREE.Mesh(bufferGeometry, bufferMaterial);
		model.scale.y = 0;
		models.add(model);
		newpoints = false;
	}
	
	document.getElementById("buildmode").addEventListener('click', (event) => {
		event.stopPropagation();
		if (!buildMode){
			buildMode = true;
			heightSet = false;
			document.getElementById("viewport").style.cursor = "crosshair";
			document.getElementById("buildmode").style.backgroundColor = "#FFAA0099";
			document.getElementById("setheight").style.backgroundColor = "#FFFFFF";
			document.getElementById("height").style.display = "none";
			//clear old points and gizmos
			points = [];
			line.geometry = new THREE.BufferGeometry().setFromPoints(points);
			gizmos.clear();
		} else {
			buildMode = false;
			document.getElementById("viewport").style.cursor  = "grab";
			document.getElementById("buildmode").style.backgroundColor = "#FFFFFF";
			
			//build model from points selected
			if (newpoints){
				createModel();
			}
		}
	});
	
	document.getElementById("setheight").addEventListener('click', (event) => {
		event.stopPropagation();
		if (!heightSet){
			heightSet = true;
			buildMode = false;
			document.getElementById("viewport").style.cursor  = "grab";
			document.getElementById("setheight").style.backgroundColor = "#FFAA0099";
			document.getElementById("buildmode").style.backgroundColor = "#FFFFFF";
			document.getElementById("height").style.display = "block";
			
			//build model from points selected
			if (newpoints){
				createModel();
			}
		} else {
			heightSet = false;
			document.getElementById("setheight").style.backgroundColor = "#FFFFFF";
			document.getElementById("height").style.display = "none";
		}
	});
	
	document.getElementById("delete").addEventListener('click', (event) => {
		event.stopPropagation();
		models.clear();
		//clear old points and gizmos
		points = [];
		line.geometry = new THREE.BufferGeometry().setFromPoints(points);
		gizmos.clear();
		buildMode = false;
		heightSet = false;
		document.getElementById("viewport").style.cursor  = "grab";
		document.getElementById("buildmode").style.backgroundColor = "#FFFFFF";
		document.getElementById("setheight").style.backgroundColor = "#FFFFFF";
		document.getElementById("height").style.display = "none";
	});
	
	document.getElementById("heightinput").addEventListener('input', (event) => {
		event.stopPropagation();
		userInputHeight = parseFloat(document.getElementById("heightinput").value);
		document.getElementById("rangeinput").value = parseFloat(document.getElementById("heightinput").value);
		model.scale.y = userInputHeight;
	});
	
	document.getElementById("rangeinput").addEventListener('input', (event) => {
		event.stopPropagation();
		userInputHeight = parseFloat(document.getElementById("heightinput").value);
		document.getElementById("heightinput").value = parseFloat(document.getElementById("rangeinput").value);
		model.scale.y = userInputHeight;
	});
	
	
	//image and plane
	const request = "https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/-122.477098046626,37.81059898565757,19/1024x1024?access_token=pk.eyJ1Ijoibmlja2ZpdHoiLCJhIjoiY2p3d2g3N2F5MDZ4azQwcG12dWticDB0diJ9.qnQV5QgYN_eDwg4uUdbO6Q";
	
	let plane;
	fetch(request).then(response => response.blob()).then(imageBlob => {
		const imageURL = URL.createObjectURL(imageBlob);
		const loader = new THREE.TextureLoader();
		texture = loader.load(imageURL);
		texture.colorSpace = THREE.SRGBColorSpace;
		
		const planeGeometry = new THREE.PlaneGeometry(1, 1);
		planeGeometry.rotateX(-Math.PI/2);
		const planeMaterial = new THREE.MeshBasicMaterial({color: 0xFFFFFF, side: THREE.FrontSide, map: texture});
		plane = new THREE.Mesh(planeGeometry, planeMaterial);
		scene.add(plane);
		scene.add(gizmos);
		scene.add(models);
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
				
				newpoints = true;
			}
		}
	}
	
	const onWindowResize = () => {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		
		renderer.setSize(canvas.clientWidth, canvas.clientHeight);
	}
	
	let renderframe = (milliseconds) => {
		//height interpolation
		if (Math.abs(model.scale.y - userInputHeight) < 0.01){
			model.scale.y = userInputHeight;
		} else if (model.scale.y < userInputHeight){
			model.scale.y += 0.01;
		} else if (model.scale.y > userInputHeight){
			model.scale.y -= 0.01;
		}
		renderer.render(scene, camera);
	}
	renderer.setAnimationLoop(renderframe);
	window.addEventListener('pointermove', onPointerMove);
	window.addEventListener('click', onPointerUp);
	window.addEventListener('resize', onWindowResize);
}

init();