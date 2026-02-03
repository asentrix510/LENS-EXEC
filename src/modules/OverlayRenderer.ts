import { Logger } from '@/utils/Logger';
import type { AROverlay, AnalysisResult, CodeRegion, Vector3 } from '@/types';
import * as THREE from 'three';

/**
 * Overlay Renderer
 * Renders visual feedback overlays in AR space using Three.js
 */
export class OverlayRenderer {
  private logger: Logger;
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private overlays: Map<string, AROverlay> = new Map();
  private overlayMeshes: Map<string, THREE.Object3D> = new Map();
  private isInitialized = false;

  constructor() {
    this.logger = new Logger('OverlayRenderer');
  }

  /**
   * Initialize the overlay renderer
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('Initializing Overlay Renderer...');
      
      // Create Three.js scene
      this.scene = new THREE.Scene();
      
      // Create camera
      this.camera = new THREE.PerspectiveCamera(
        75, // FOV
        window.innerWidth / window.innerHeight, // Aspect ratio
        0.1, // Near plane
        1000 // Far plane
      );
      
      // Create renderer
      this.renderer = new THREE.WebGLRenderer({ 
        alpha: true, // Transparent background for AR
        antialias: true 
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setClearColor(0x000000, 0); // Transparent
      
      // Add renderer to DOM
      const appElement = document.getElementById('app');
      if (appElement) {
        appElement.appendChild(this.renderer.domElement);
        
        // Position renderer canvas above video
        this.renderer.domElement.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 10;
        `;
      }
      
      // Handle window resize
      window.addEventListener('resize', this.onWindowResize.bind(this));
      
      // Start render loop
      this.startRenderLoop();
      
      this.isInitialized = true;
      this.logger.info('Overlay Renderer initialized');
      
    } catch (error) {
      this.logger.error('Failed to initialize Overlay Renderer:', error);
      throw error;
    }
  }

  /**
   * Create overlays for analysis results
   */
  async createOverlaysForAnalysis(region: CodeRegion, analysisResult: AnalysisResult): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Overlay Renderer not initialized');
    }

    try {
      // Remove existing overlays for this region
      this.removeOverlaysForRegion(region.id);

      // Create error overlays
      for (const error of analysisResult.errors) {
        const overlay = this.createErrorOverlay(region, error);
        this.addOverlay(overlay);
      }

      // Create suggestion overlays
      for (const suggestion of analysisResult.suggestions) {
        const overlay = this.createSuggestionOverlay(region, suggestion);
        this.addOverlay(overlay);
      }

      // Create simulation overlay if available
      if (analysisResult.simulationResult) {
        const overlay = this.createSimulationOverlay(region, analysisResult.simulationResult);
        this.addOverlay(overlay);
      }

      this.logger.debug(`Created overlays for region ${region.id}`);

    } catch (error) {
      this.logger.error('Error creating overlays:', error);
    }
  }

  /**
   * Create error overlay
   */
  createErrorOverlay(region: CodeRegion, error: any): AROverlay {
    const position = this.calculateOverlayPosition(region, 'error');
    
    return {
      id: this.generateOverlayId('error'),
      type: 'error',
      position,
      content: {
        text: error.description,
        color: this.getErrorColor(error.severity),
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        fontSize: 14,
      },
      visibility: true,
      trackingTarget: region,
    };
  }

  /**
   * Create suggestion overlay
   */
  createSuggestionOverlay(region: CodeRegion, suggestion: any): AROverlay {
    const position = this.calculateOverlayPosition(region, 'suggestion');
    
    return {
      id: this.generateOverlayId('suggestion'),
      type: 'suggestion',
      position,
      content: {
        text: suggestion.description,
        color: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        fontSize: 12,
      },
      visibility: true,
      trackingTarget: region,
    };
  }

  /**
   * Create simulation overlay
   */
  createSimulationOverlay(region: CodeRegion, simulationResult: any): AROverlay {
    const position = this.calculateOverlayPosition(region, 'simulation');
    
    return {
      id: this.generateOverlayId('simulation'),
      type: 'simulation',
      position,
      content: {
        text: `Output: ${simulationResult.output}`,
        color: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        fontSize: 12,
      },
      visibility: true,
      trackingTarget: region,
    };
  }

  /**
   * Add overlay to the scene
   */
  private addOverlay(overlay: AROverlay): void {
    if (!this.scene) {
      return;
    }

    // Create 3D mesh for the overlay
    const mesh = this.createOverlayMesh(overlay);
    
    // Add to scene
    this.scene.add(mesh);
    
    // Store references
    this.overlays.set(overlay.id, overlay);
    this.overlayMeshes.set(overlay.id, mesh);
  }

  /**
   * Create 3D mesh for overlay
   */
  private createOverlayMesh(overlay: AROverlay): THREE.Object3D {
    const group = new THREE.Group();
    
    // Create background plane
    const bgGeometry = new THREE.PlaneGeometry(2, 0.5);
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: overlay.content.backgroundColor || 'rgba(0, 0, 0, 0.8)',
      transparent: true,
      opacity: 0.8,
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    group.add(bgMesh);
    
    // Create text (simplified - in a full implementation, use a text rendering library)
    const textGeometry = new THREE.PlaneGeometry(1.8, 0.3);
    const textMaterial = new THREE.MeshBasicMaterial({
      color: overlay.content.color || '#ffffff',
      transparent: true,
    });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.z = 0.01; // Slightly in front of background
    group.add(textMesh);
    
    // Position the group
    group.position.set(overlay.position.x, overlay.position.y, overlay.position.z);
    
    // Make overlay face the camera
    group.lookAt(0, 0, 0);
    
    return group;
  }

  /**
   * Calculate overlay position based on code region
   */
  private calculateOverlayPosition(region: CodeRegion, type: string): Vector3 {
    // Convert 2D region coordinates to 3D world space
    // This is a simplified implementation
    
    const centerX = region.boundingBox.x + region.boundingBox.width / 2;
    const centerY = region.boundingBox.y + region.boundingBox.height / 2;
    
    // Normalize to [-1, 1] range
    const normalizedX = (centerX / window.innerWidth) * 2 - 1;
    const normalizedY = -((centerY / window.innerHeight) * 2 - 1); // Flip Y axis
    
    // Offset based on overlay type
    let offsetY = 0;
    switch (type) {
      case 'error':
        offsetY = 0.2;
        break;
      case 'suggestion':
        offsetY = -0.2;
        break;
      case 'simulation':
        offsetY = -0.4;
        break;
    }
    
    return {
      x: normalizedX * 3, // Scale for 3D space
      y: normalizedY * 3 + offsetY,
      z: -2, // Distance from camera
    };
  }

  /**
   * Update overlay position for tracking
   */
  updateOverlayPosition(overlayId: string, newPosition: Vector3): void {
    const mesh = this.overlayMeshes.get(overlayId);
    const overlay = this.overlays.get(overlayId);
    
    if (mesh && overlay) {
      mesh.position.set(newPosition.x, newPosition.y, newPosition.z);
      overlay.position = newPosition;
    }
  }

  /**
   * Remove specific overlay
   */
  removeOverlay(overlayId: string): void {
    const mesh = this.overlayMeshes.get(overlayId);
    
    if (mesh && this.scene) {
      this.scene.remove(mesh);
      
      // Dispose of geometry and materials
      if (mesh instanceof THREE.Group) {
        mesh.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
    }
    
    this.overlays.delete(overlayId);
    this.overlayMeshes.delete(overlayId);
  }

  /**
   * Remove all overlays for a specific region
   */
  private removeOverlaysForRegion(regionId: string): void {
    const overlaysToRemove: string[] = [];
    
    for (const [overlayId, overlay] of this.overlays) {
      if (overlay.trackingTarget?.id === regionId) {
        overlaysToRemove.push(overlayId);
      }
    }
    
    overlaysToRemove.forEach(overlayId => this.removeOverlay(overlayId));
  }

  /**
   * Clear all overlays
   */
  clearAllOverlays(): void {
    const overlayIds = Array.from(this.overlays.keys());
    overlayIds.forEach(overlayId => this.removeOverlay(overlayId));
  }

  /**
   * Toggle overlay visibility
   */
  toggleOverlayVisibility(overlayId: string, visible: boolean): void {
    const mesh = this.overlayMeshes.get(overlayId);
    const overlay = this.overlays.get(overlayId);
    
    if (mesh && overlay) {
      mesh.visible = visible;
      overlay.visibility = visible;
    }
  }

  /**
   * Get error color based on severity
   */
  private getErrorColor(severity: string): string {
    switch (severity) {
      case 'high':
        return '#F44336'; // Red
      case 'medium':
        return '#FF9800'; // Orange
      case 'low':
        return '#FFC107'; // Yellow
      default:
        return '#FF5722'; // Deep Orange
    }
  }

  /**
   * Generate unique overlay ID
   */
  private generateOverlayId(type: string): string {
    return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle window resize
   */
  private onWindowResize(): void {
    if (!this.camera || !this.renderer) {
      return;
    }

    // Update camera aspect ratio
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }

    // Update renderer size
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Start render loop
   */
  private startRenderLoop(): void {
    const animate = () => {
      if (!this.isInitialized) {
        return;
      }

      requestAnimationFrame(animate);
      
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    animate();
  }

  /**
   * Get overlay statistics
   */
  getOverlayStats() {
    const stats = {
      total: this.overlays.size,
      byType: {} as Record<string, number>,
      visible: 0,
    };

    for (const overlay of this.overlays.values()) {
      stats.byType[overlay.type] = (stats.byType[overlay.type] || 0) + 1;
      if (overlay.visibility) {
        stats.visible++;
      }
    }

    return stats;
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.logger.info('Disposing Overlay Renderer...');
    
    // Clear all overlays
    this.clearAllOverlays();
    
    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    
    // Dispose of Three.js resources
    if (this.renderer) {
      if (this.renderer.domElement && this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
      this.renderer = null;
    }
    
    this.scene = null;
    this.camera = null;
    this.isInitialized = false;
    
    this.logger.info('Overlay Renderer disposed');
  }
}