import React, { useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Box, Sphere, Cylinder, Plane, Environment, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { LevelMap, Entity, Skin } from '../types';

interface Map3DProps {
  levelMap: LevelMap;
  playerPos: { x: number, y: number };
  playerSkin: Skin | null;
}

const WALL_HEIGHT = 1.5;

function GhostModel({ position, color }: { position: [number, number, number], color: string }) {
  // We use a procedural ghost instead of the GLB since it failed to load
  return (
    <group position={position}>
      {/* Ghost Body (Sphere stretched and cut off at bottom visually) */}
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.3, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Ghost Tail/Base wavy bits */}
      <mesh position={[0, 0.3, 0]} rotation={[0, 0, Math.PI]}>
         <cylinderGeometry args={[0.3, 0.25, 0.4, 16, 1, true]} />
         <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.8} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.1, 0.7, 0.26]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh position={[0.1, 0.7, 0.26]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      
      <pointLight color={color} distance={6} intensity={4} position={[0, 1, 0]} />
    </group>
  );
}

function CameraController({ playerPos, mapWidth, mapHeight }: { playerPos: {x: number, y: number}, mapWidth: number, mapHeight: number }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  
  useEffect(() => {
     // Center of the map is 0,0. Let's arrange so the world bounds are from -width/2 to width/2
  }, []);

  useFrame(() => {
     const pX = playerPos.x - mapWidth / 2;
     const pZ = playerPos.y - mapHeight / 2;
     
     targetPos.current.set(pX, 5, pZ + 5); 
     camera.position.lerp(targetPos.current, 0.1);
     
     const lookAtTarget = new THREE.Vector3(pX, 0, pZ);
     // We can use a ref for the lookat to smoothly interpolate it too
     camera.lookAt(lookAtTarget);
  });

  return null;
}

function Player({ pos, skin, mapWidth, mapHeight }: { pos: {x: number, y: number}, skin: Skin | null, mapWidth: number, mapHeight: number }) {
  const meshRef = useRef<THREE.Group>(null);
  
  const targetX = pos.x - mapWidth / 2 + 0.5;
  const targetZ = pos.y - mapHeight / 2 + 0.5;

  useFrame(() => {
    if (meshRef.current) {
        meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.2);
        meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, 0.2);
    }
  });

  // Decide color from skin
  let color = '#3b82f6'; // blue default
  if (skin?.colorClass.includes('fuchsia')) color = '#e879f9';
  if (skin?.colorClass.includes('red')) color = '#dc2626';
  if (skin?.colorClass.includes('indigo')) color = '#4f46e5';
  if (skin?.colorClass.includes('amber')) color = '#d97706';
  if (skin?.colorClass.includes('orange')) color = '#f97316';
  if (skin?.colorClass.includes('slate')) color = '#334155';
  if (skin?.colorClass.includes('white')) color = '#ffffff';
  if (skin?.colorClass.includes('purple')) color = '#a855f7';
  if (skin?.colorClass.includes('stone')) color = '#1c1917';
  if (skin?.colorClass.includes('cyan')) color = '#22d3ee';

  if (skin?.iconName === 'Ghost') {
    return (
      <group ref={meshRef} position={[targetX, 0, targetZ]}>
        <ErrorBoundary fallback={<PlayerFallback color={color} />}>
          <Suspense fallback={<PlayerFallback color={color} />}>
            <GhostModel position={[0, 0, 0]} color={color} />
          </Suspense>
        </ErrorBoundary>
      </group>
    );
  }

  return (
    <group ref={meshRef} position={[targetX, 0, targetZ]}>
      <PlayerFallback color={color} />
    </group>
  );
}

function PlayerFallback({ color }: { color: string }) {
  return (
    <group>
      {/* Head */}
      <Sphere args={[0.2, 32, 32]} position={[0, 0.8, 0]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.2} metalness={0.8} />
      </Sphere>
      {/* Body */}
      <Cylinder args={[0.2, 0.2, 0.6, 16]} position={[0, 0.3, 0]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.2} metalness={0.8} />
      </Cylinder>
      <pointLight color={color} distance={6} intensity={4} position={[0, 1.5, 0]} />
    </group>
  );
}

// Error boundary to catch glTF loading errors
class ErrorBoundary extends React.Component<{ fallback: React.ReactNode, children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}


function GameEntity({ entity, mapWidth, mapHeight }: { entity: Entity, mapWidth: number, mapHeight: number }) {
  const meshRef = useRef<THREE.Group>(null);
  const targetX = entity.x - mapWidth / 2 + 0.5;
  const targetZ = entity.y - mapHeight / 2 + 0.5;

  let color = '#737373';
  let emissive = '#000000';
  let lightColor = null;

  if (entity.type === 'exit') {
     color = '#34d399';
     emissive = '#34d399';
     lightColor = '#34d399';
  } else if (entity.type === 'guard') {
     color = '#ef4444';
     emissive = '#ef4444';
     lightColor = '#ef4444';
  } else if (entity.type === 'camera') {
     color = '#f97316';
     emissive = '#f97316';
     lightColor = '#f97316';
  } else if (entity.type === 'door') {
     color = '#eab308';
  } else if (entity.type === 'stash') {
     color = '#22d3ee';
  } else if (entity.type === 'inmate') {
     color = '#a3a3a3';
  }

  return (
    <group ref={meshRef} position={[targetX, 0, targetZ]}>
       {entity.type === 'guard' && (
           <group>
             <Sphere args={[0.2, 16, 16]} position={[0, 0.8, 0]}>
                <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.2} />
             </Sphere>
             <Cylinder args={[0.25, 0.25, 0.6, 16]} position={[0, 0.3, 0]}>
                <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.2} />
             </Cylinder>
           </group>
       )}
       {entity.type === 'camera' && <Box args={[0.4, 0.4, 0.4]} position={[0, 0.8, 0]}><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.5} /></Box>}
       {entity.type === 'door' && <Box args={[0.8, 1, 0.2]} position={[0, 0.5, 0]}><meshStandardMaterial color={color} /></Box>}
       {entity.type === 'stash' && <Box args={[0.5, 0.5, 0.5]} position={[0, 0.25, 0]}><meshStandardMaterial color={color} /></Box>}
       {entity.type === 'inmate' && (
           <group>
             <Sphere args={[0.2, 16, 16]} position={[0, 0.7, 0]}>
               <meshStandardMaterial color={color} />
             </Sphere>
             <Cylinder args={[0.2, 0.2, 0.5, 16]} position={[0, 0.25, 0]}>
               <meshStandardMaterial color={color} />
             </Cylinder>
           </group>
       )}
       {entity.type === 'exit' && <Cylinder args={[0.5, 0.5, 0.1]} position={[0, 0.05, 0]}><meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.8} /></Cylinder>}
       
       {lightColor && <pointLight color={lightColor} distance={5} intensity={3} position={[0, 1.5, 0]} />}
    </group>
  );
}

export function Map3D({ levelMap, playerPos, playerSkin }: Map3DProps) {
  const walls = [];

  for (let y = 0; y < levelMap.height; y++) {
    for (let x = 0; x < levelMap.width; x++) {
      if (levelMap.walls[y][x]) {
        walls.push(
          <Box 
            key={`${x}-${y}`} 
            args={[1, WALL_HEIGHT, 1]} 
            position={[x - levelMap.width / 2 + 0.5, WALL_HEIGHT / 2, y - levelMap.height / 2 + 0.5]}
          >
            <meshStandardMaterial color="#262626" roughness={0.9} />
          </Box>
        );
      }
    }
  }

  // Calculate grid bounds
  const mWidth = levelMap.width;
  const mHeight = levelMap.height;

  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas shadows camera={{ position: [0, 10, 10], fov: 45 }}>
        <color attach="background" args={['#0a0a0c']} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 20, 10]} intensity={1.2} />
        <hemisphereLight args={['#444455', '#0f0f12', 0.5]} />
        
        {/* Floor */}
        <Plane args={[mWidth, mHeight]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#0a0a0a" roughness={0.1} metalness={0.1} />
        </Plane>

        {/* Walls */}
        <group>{walls}</group>

        {/* Player */}
        <Player pos={playerPos} skin={playerSkin} mapWidth={mWidth} mapHeight={mHeight} />

        {/* Entities */}
        {levelMap.entities.map(e => !e.resolved && (
           <GameEntity key={e.id} entity={e} mapWidth={mWidth} mapHeight={mHeight} />
        ))}

        <CameraController playerPos={playerPos} mapWidth={mWidth} mapHeight={mHeight} />
        
        {/* Adds nice environmental lighting */}
        <Environment preset="night" />
      </Canvas>
    </div>
  );
}
