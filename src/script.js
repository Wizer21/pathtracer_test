import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as TRACER from "three-gpu-pathtracer";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { ParallelMeshBVHWorker } from "three-mesh-bvh/src/workers/ParallelMeshBVHWorker.js";
import { MeshBVH } from "three-mesh-bvh";

const canvas = document.querySelector("canvas.webgl");
const scene = new THREE.Scene();

// Base camera
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
camera.position.x = 30;
camera.position.y = 30;
camera.position.z = 30;
scene.add(camera);

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.toneMapping = THREE.ACESFilmicToneMapping;

// Pathtracer
const pathTracer = new TRACER.WebGLPathTracer(renderer);
pathTracer.setBVHWorker(new ParallelMeshBVHWorker());

// Lights
const pointLight = new THREE.PointLight(0xffffff, 5000);
pointLight.position.x = 40;
pointLight.position.y = 40;
pointLight.position.z = 40;
const pointLight2 = new THREE.PointLight(0xffffff, 5000);
pointLight2.position.x = -40;
pointLight2.position.y = 40;
pointLight2.position.z = -40;
scene.add(pointLight, pointLight2);

const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("./models/");
loader.setDRACOLoader(dracoLoader);

let isReady = false;
loader.load("./models/church.glb", (gltf) => {
  gltf.scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.boundsTree = new MeshBVH(object.geometry);
    }
  });
  scene.add(gltf.scene);

  console.log("load.load finished");
  console.time("Load the complete scene");
  console.time("start fire load events");
  let gotFirstEvent = false;
  pathTracer.setSceneAsync(scene, camera, {
    onProgress: (value) => {
      // First event
      if (!gotFirstEvent) {
        gotFirstEvent = true;
        console.timeEnd("start fire load events");
      }

      // Last event
      if (value === 1) {
        isReady = true;
        console.timeEnd("Load the complete scene");
      }
    },
  });
});

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const resize = () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  pathTracer.updateCamera();
};
window.addEventListener("resize", () => resize);
resize();

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

// Loop
controls.addEventListener("change", () => pathTracer.updateCamera());

const tick = () => {
  // Update controls
  controls.update();

  // Render
  if (isReady) {
    pathTracer.renderSample();
  } else {
    renderer.render(scene, camera);
  }

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
