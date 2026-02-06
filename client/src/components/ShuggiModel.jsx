import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";

const ShuggiModel = forwardRef(function ShuggiModel(_props, ref) {
  const groupRef = useRef();
  const vrmRef = useRef();

  useEffect(() => {
    const loader = new GLTFLoader();

    // 🔥 THIS is the key (new API)
    loader.register((parser) => new VRMLoaderPlugin(parser));

    let currentVrm = null;

    loader.load(
      "/shuggi_final.vrm",
      (gltf) => {
        const vrm = gltf.userData.vrm;

        // VRM standard cleanup
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.combineSkeletons(gltf.scene);

        const scene = vrm.scene;
        scene.rotation.y = Math.PI; // face camera
        scene.traverse((o) => (o.frustumCulled = false));

        // Auto-center and scale so the avatar appears in the middle of the view.
        scene.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(scene);
        if (!box.isEmpty()) {
          const size = new THREE.Vector3();
          box.getSize(size);

          const targetHeight = 1.6; // meters (roughly human height)
          if (size.y > 0) {
            const scale = targetHeight / size.y;
            scene.scale.setScalar(scale);
          }

          scene.updateMatrixWorld(true);
          const boxScaled = new THREE.Box3().setFromObject(scene);
          if (!boxScaled.isEmpty()) {
            const centerScaled = new THREE.Vector3();
            boxScaled.getCenter(centerScaled);

            scene.position.set(-centerScaled.x, -boxScaled.min.y, -centerScaled.z);
          }
        }

        if (groupRef.current) {
          groupRef.current.add(scene);
        }
        vrmRef.current = vrm;
        currentVrm = vrm;
      },
      undefined,
      (err) => {
        console.error("❌ VRM load failed:", err);
      }
    );

    return () => {
      if (currentVrm && groupRef.current) {
        groupRef.current.remove(currentVrm.scene);
        currentVrm.dispose?.();
        vrmRef.current = null;
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    get group() {
      return groupRef.current;
    },
    get vrm() {
      return vrmRef.current;
    },
  }));

  return <group ref={groupRef} />;
});

export default ShuggiModel;
