import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.121.1/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/controls/OrbitControls.js';

function main() {
    const canvas = document.querySelector('#scene');
    const renderer = new THREE.WebGLRenderer({canvas});

    // renderer.vr.enabled = true;
    // document.body.appendChild(WEBVR.createButton(renderer));

    const fov = 50;
    const aspect = 2;  // the canvas default
    const near = 0.1;
    const far = 256;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    //camera.rotation.set(Math.PI / 3, Math.PI / 3, 0);
    camera.position.set(8, 4, 8);
    const cameraDirection = new THREE.Vector3();
    // camera.getWorldDirection(cameraDirecton);

    const controls = new OrbitControls(camera, renderer.domElement);
    // let sphericalTarget = new THREE.Spherical(1, Math.PI / 2 - 1, 1);
    // let target = new THREE.Vector3().setFromSpherical(sphericalTarget);
    // controls.target = target;
    //controls.target.set(0,3,0);
    //camera.getWorldPosition(controls.target);
    //controls.target.addScaledVector(cameraDirecton, 0);
    //controls.update();

    const scene = new THREE.Scene();

    scene.add(camera);

    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    {
        const color = 0xFFFFF;
        const light1 = new THREE.DirectionalLight(color, 1);
        light1.position.set(-10, 10, -7);
        camera.add(light1);
        const light2 = new THREE.DirectionalLight(color, 0.75);
        light2.position.set(10, 10, 0);
        camera.add(light2);
        const light3 = new THREE.DirectionalLight(color, 0.5);
        light3.position.set(10, -10, 0);
        camera.add(light3);
        const light4 = new THREE.DirectionalLight(color, 0.5);
        light4.position.set(-10, -10, 0);
        camera.add(light4);
    }

    // Prism plane
    var points = [
        new THREE.Vector3(1.4, 5, 0),
        new THREE.Vector3(1.4, -5, 0),
        new THREE.Vector3(-1.4, -5, 0),
        new THREE.Vector3(-1.4, 5, 0),
    ];
    const shape = new THREE.Shape(points);
    const geometry = new THREE.ShapeGeometry(shape);

    function makeInstance(geometry, position, rotation) {
        const material = new THREE.MeshPhysicalMaterial({
            color: 0x44aa88,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide });

        const mesh = new THREE.Mesh(geometry.clone(), material);
        scene.add(mesh);

        mesh.position.copy(position);
        mesh.rotation.copy(rotation);
        // mesh.rotateX(rotation.x);
        // mesh.rotateY(rotation.y);
        // mesh.rotateZ(rotation.z);

        // mesh.updateMatrix();
        // mesh.geometry.applyMatrix( mesh.matrix );
        // mesh.matrix.identity();
        // renderer.render(scene, camera);
        // const triangles = [
        //     new THREE.Triangle(mesh.localToWorld(mesh.geometry.vertices[0].clone()), mesh.localToWorld(mesh.geometry.vertices[1].clone()), mesh.localToWorld(mesh.geometry.vertices[2].clone())),
        //     new THREE.Triangle(mesh.localToWorld(mesh.geometry.vertices[2].clone()), mesh.localToWorld(mesh.geometry.vertices[3].clone()), mesh.localToWorld(mesh.geometry.vertices[0].clone()))
        // ];

        return { mesh };
    }

    // Prism init
    const meshes = [
        makeInstance(geometry, new THREE.Vector3(0, -0.81, 0), new THREE.Euler(Math.PI / 2, 0, 0)),
        makeInstance(geometry, new THREE.Vector3(-0.7, 0.4, 0), new THREE.Euler(Math.PI / 2, Math.PI / 3, 0)),
        makeInstance(geometry, new THREE.Vector3(0.7, 0.4, 0), new THREE.Euler(Math.PI / 2, -Math.PI / 3, 0))
    ];
    renderer.render(scene, camera);
    // Prizm planes - real world location after rendering
    for (var i in meshes) {
        const mesh = meshes[i].mesh;
        const verts = [ mesh.localToWorld(mesh.geometry.vertices[0]).clone(), mesh.localToWorld(mesh.geometry.vertices[1]).clone(), mesh.localToWorld(mesh.geometry.vertices[2]).clone(), mesh.localToWorld(mesh.geometry.vertices[3]).clone() ]
        meshes[i].triangles = [
            new THREE.Triangle(verts[0], verts[1], verts[2]),
            new THREE.Triangle(verts[2], verts[3], verts[0])
        ];
    }

    // Laser torch init
    // const v1 = new THREE.Vector3(0, 0, 0);
    // const v2 = new THREE.Vector3(0.5, 0.5, -5);
    // const dir = new THREE.Vector3();
    // dir.subVectors(v2, v1).normalize();
    // dir.normalize();
    const laserTorchRay = new THREE.Ray(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1).normalize());
    const laserTorchGeometry = new THREE.CylinderGeometry(0.1, 0.01, 0.80, 16);
    laserTorchGeometry.rotateX(Math.PI * 0.5);
    const laserTorchMaterial = new THREE.MeshPhysicalMaterial({ color: 0xf0f0f0 });
    const laserTorchMesh = new THREE.Mesh(laserTorchGeometry, laserTorchMaterial);
    scene.add(laserTorchMesh);

    var torchPosition = new THREE.Vector3();
    var torchDirection = new THREE.Vector3();
    var torchRotation = new THREE.Euler();
    var torchQuaternion = new THREE.Quaternion();

    // Laser init
    var laser = new THREE.Line();

    // Initial torch position
    //torchRotate(0);
    torchMove(-5);
    torchRotate(Math.PI / 180 * 140, 0, 0, 1);
    traceRay();

    function traceRay() {
        let lastReflection = { ray: laserTorchRay.clone(), mesh: null };
        let reflection;
        const laserGeometry = new THREE.Geometry();
        laserGeometry.vertices.push(lastReflection.ray.origin);
        var c = 0;
        while ((reflection = rayIntersectAndReflection(lastReflection.ray)) !== null) {
            if (reflection.mesh === lastReflection.mesh) {
                // avoid recursion
                // - when ray and triangle are on the same plane
                // - when reflected ray intercect the same triangle
                lastReflection.ray.origin.set(
                    lastReflection.ray.origin.x + lastReflection.ray.direction.x * 0.000000000000001,
                    lastReflection.ray.origin.y + lastReflection.ray.direction.y * 0.000000000000001,
                    lastReflection.ray.origin.z + lastReflection.ray.direction.z * 0.000000000000001
                );
                c++;
                if (c >= 10) {
                    break;
                }
                continue;
            }
            c = 0;
            lastReflection.ray = reflection.ray;
            lastReflection.mesh = reflection.mesh;
            laserGeometry.vertices.push(lastReflection.ray.origin);
        }
        let endOfRay = lastReflection.ray.direction.multiplyScalar(10);
        endOfRay.set(endOfRay.x+lastReflection.ray.origin.x, endOfRay.y+lastReflection.ray.origin.y)
        laserGeometry.vertices.push(endOfRay);
        scene.remove(laser);
        laser = new THREE.Line(laserGeometry, new THREE.LineBasicMaterial({color: 0xff0000}));
        scene.add(laser);
    }

    function rayIntersectAndReflection(ray) {
        for (var i in meshes) {
            for (var j in meshes[i].triangles) {
                const triangle = meshes[i].triangles[j].clone();
                let intersection = new THREE.Vector3();
                ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, intersection);
                // Debug
                // if (i == 2 && j == 1) {
                //     var geomDebug = new THREE.Geometry();
                //     geomDebug.vertices.push(triangle.a);
                //     geomDebug.vertices.push(triangle.b);
                //     geomDebug.vertices.push(triangle.c);
                //     geomDebug.vertices.push(triangle.a);
                //     var lineDebug = new THREE.Line(geomDebug, new THREE.LineBasicMaterial({color: 0x0000ff}));
                //     scene.add(lineDebug);
                // }
                //
                if (intersection.x !== 0 || intersection.y !== 0 || intersection.z !== 0) {
                    const reflection = Geometry.reflection(triangle, ray, intersection)
                    return {
                        ray: new THREE.Ray(intersection, reflection.reflectionVector),
                        mesh: meshes[i]
                    };
                }
            }
        }
        return null;
    }

    function render(time) {
        time *= 0.001;

        if (/*!renderer.vr.isPresenting() && */resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        meshes.forEach((cube, ndx) => {
            const speed = 1 + ndx * .1;
            const rot = time * speed;
            //cube.rotation.x = rot;
            //cube.rotation.y = rot;
        });

        renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(render);

    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height);
        }
        return needResize;
    }

    // Keys
    document.addEventListener("keydown", onDocumentKeyDown, false);
    function onDocumentKeyDown(event) {
        var keyCode = event.which;
        if (keyCode == 87) {
            // W - up
            torchMove(0.1);
        } else if (keyCode == 83) {
            // S - down
            torchMove(-0.1);
        }
        if (keyCode == 65) {
            // A - left
            torchRotate(Math.PI / 72, 0, 0, 1);
        } else if (keyCode == 68) {
            // D - right
            torchRotate(-Math.PI / 72, 0, 0, 1);
        }
        if (keyCode == 82) {
            // R
            torchRotate(Math.PI / 72, 0, 1, 0);
        } else if (keyCode == 70) {
            // F
            torchRotate(-Math.PI / 72, 0, 1, 0);
        }
        // if (keyCode == 88) {
        //     // X
        //     torchRotate(0, -Math.PI / 36, 0);
        // } else if (keyCode == 67) {
        //     // C
        //     torchRotate(0, Math.PI / 36, 0);
        // }
        if (keyCode == 32) {
            // space
        }
        traceRay();
    };

    function torchMove(step) {
        torchPosition.copy(laserTorchRay.origin);
        torchDirection.copy(laserTorchRay.direction);
        torchPosition.x += torchDirection.x * step;
        torchPosition.y += torchDirection.y * step;
        torchPosition.z += torchDirection.z * step;
        laserTorchRay.origin.copy(torchPosition);
        laserTorchMesh.position.copy(torchPosition);
    }

    function torchRotate(step, x, y, z) {
        cameraDirection.set(x, y, z).normalize();
        cameraDirection.applyQuaternion(camera.quaternion);
        cameraDirection.normalize();
        torchDirection.copy(laserTorchRay.direction);
        torchDirection.applyAxisAngle(cameraDirection, step)
        laserTorchRay.direction.copy(torchDirection);
        laserTorchMesh.lookAt(laserTorchRay.origin.x + torchDirection.x, laserTorchRay.origin.y + torchDirection.y, laserTorchRay.origin.z + torchDirection.z);
    }

}

class Geometry {
    static reflection(triangle, ray, intersectionPoint) {
        let a = triangle.a;
        let b = triangle.b;
        let c = triangle.c;
        let rayStart = ray.origin;
        let rayDirection = ray.direction.normalize();

        // Intersection Point
        let subB = new THREE.Vector3();
        let subC = new THREE.Vector3();
        subB.subVectors(a, b);
        subC.subVectors(a, c);
        let n = Geometry.crossProduct(subB, subC);
        let angle = Geometry.angleBetweenVectors(rayDirection, n.negate());
        if (angle >= Math.PI/2) {
            n = n.negate();
            angle -= Math.PI/2;
        }
        // let t = -(Geometry.dotProduct(n, rayStart) - Geometry.dotProduct(n, a)) / Geometry.dotProduct(n, rayDirection);
        // let intersectionPoint = rayStart.add(rayDirection.multiplyScalar(t)).toPoint();

        // Reflection Vector
        //triangle.getNormal(n)
        n = n.normalize();
        n = n.multiplyScalar(2*Geometry.dotProduct(rayDirection, n));
        let reflectionVector = new THREE.Vector3();
        reflectionVector.subVectors(rayDirection, n);
        return { point: intersectionPoint, angle: angle, reflectionVector: reflectionVector };
    }

    static angleBetweenVectors(a, b) {
        return Math.acos(Geometry.dotProduct(a, b)/(a.length()*b.length()));
    }

    static dotProduct(v1, v2) {
        return v1.x*v2.x + v1.y*v2.y + v1.z*v2.z;
    }

    static crossProduct(v1, v2) {
        let x = (v1.y*v2.z) - (v1.z*v2.y);
        let y = (v1.z*v2.x) - (v1.x*v2.z);
        let z = (v1.x*v2.y) - (v1.y*v2.x);
        return new THREE.Vector3(x, y, z);
    }
}

main();
