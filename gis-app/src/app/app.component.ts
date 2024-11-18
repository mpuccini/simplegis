import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-draw'; // Import Leaflet.draw
import { HttpClient } from '@angular/common/http';
import { GeoJsonProperties } from 'geojson';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private map!: L.Map; // Use "!" to indicate that the property will be initialized
  selectedFile: File | null = null; // To store the selected file
  layers: any[] = []; // To store the list of layers from the database

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    console.log('Initializing map...');
    this.map = L.map('map').setView([41, 12], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(this.map);

    console.log('Map initialized:', this.map);

    const drawnItems = new L.FeatureGroup();
    this.map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      edit: { featureGroup: drawnItems }
    });
    this.map.addControl(drawControl);

    this.map.on('draw:created', (e: any) => {
      const layer = e.layer;
      drawnItems.addLayer(layer);
      const drawnRegion = layer.toGeoJSON();
      console.log('Drawn region:', drawnRegion);

      const queryUrl = 'http://localhost:8000/query';
      this.http.post(queryUrl, drawnRegion).subscribe({
        next: (response: any) => {
          console.log('Query results:', response);
          response.features.forEach((feature: any) => {
            L.geoJSON(feature).addTo(this.map);
          });
        },
        error: (err) => {
          console.error('Query failed:', err);
        }
      });
    });

    // Load layers from the backend
    this.loadLayers();
  }

  // Load layers from the backend
  loadLayers(): void {
    this.http.get<any[]>('http://localhost:8000/layers').subscribe({
      next: (layers) => {
        this.layers = layers;
      },
      error: (err) => {
        console.error('Failed to load layers:', err);
      }
    });
  }

  // Handle file selection
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      console.log('File selected:', this.selectedFile.name);
    }
  }

  // Handle file upload
  onUpload(): void {
    if (!this.selectedFile) return;

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    // Replace with your API endpoint
    const uploadUrl = 'http://localhost:8000/upload';

    this.http.post(uploadUrl, formData).subscribe({
      next: (response) => {
        console.log('File uploaded successfully:', response);
      },
      error: (err) => {
        console.error('Error during file upload:', err);
      }
    });
  }

  // Handle the layer selection and display
  onLayerSelected(event: Event): void {
    const input = event.target as HTMLSelectElement;
    const selectedLayerId = input.value;

    if (selectedLayerId) {
      this.http.get<any>(`http://localhost:8000/layers/${selectedLayerId}`, {}).subscribe({
        next: (layer) => {
          console.log('Selected layer:', selectedLayerId);

          if (layer && layer.geometry) {
            const multiPolygon = layer.geometry.coordinates;

            // multiPolygon.forEach((polygon: [number, number][]) => {
            //   const formattedCoordinates = polygon.map((coord: [number, number]) => [coord[1], coord[0]]);  // Reverse [lat, lon]

              const geoJsonGeometry: GeoJSON.MultiPolygon = {
                type: "MultiPolygon",
                coordinates: multiPolygon.map((polygon: [number, number][]) => 
                  polygon.map((coord: [number, number]) => [coord[1], coord[0]]))
              };
              
              const geoJsonLayer: GeoJSON.Feature<GeoJSON.MultiPolygon, GeoJsonProperties> = {
                type: "Feature",
                geometry: geoJsonGeometry,
                properties: layer.properties || {}
              };

              const leafletLayer = L.geoJSON(geoJsonLayer);
              leafletLayer.addTo(this.map);
          
              // Zoom to the bounds of the layer
              this.map.fitBounds(leafletLayer.getBounds());
        } else {
          console.error('Selected layer is empty:', layer);
        }
        },
        error: (err) => {
          console.log('Selected layer:', selectedLayerId);
          console.error('Error fetching selected layer:', err);
        }
      });
    }
  }
}



// import { Component, OnInit } from '@angular/core';
// import * as L from 'leaflet';
// import 'leaflet-draw'; // Import Leaflet.draw
// import { HttpClient } from '@angular/common/http';

// @Component({
//   selector: 'app-root',
//   templateUrl: './app.component.html',
//   styleUrls: ['./app.component.css']
// })
// export class AppComponent implements OnInit {
//   private map!: L.Map; // Use "!" to indicate that the property will be initialized
//   selectedFile: File | null = null; // To store the selected file

//   constructor(private http: HttpClient) {}

//   ngOnInit(): void {
//     console.log('Initializing map...');
//     this.map = L.map('map').setView([41, 12], 6);

//     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//       maxZoom: 19
//     }).addTo(this.map);

//     console.log('Map initialized:', this.map);

//     const drawnItems = new L.FeatureGroup();
//     this.map.addLayer(drawnItems);

//     const drawControl = new L.Control.Draw({
//       edit: { featureGroup: drawnItems }
//     });
//     this.map.addControl(drawControl);

//     this.map.on('draw:created', (e: any) => {
//       const layer = e.layer;
//       drawnItems.addLayer(layer);
//       const drawnRegion = layer.toGeoJSON();
//       console.log('Drawn region:', drawnRegion);

//     const queryUrl = 'http://localhost:8000/query';
//     this.http.post(queryUrl, drawnRegion).subscribe({
//       next: (response: any) => {
//         console.log('Query results:', response);
//         response.features.forEach((feature: any) => {
//           L.geoJSON(feature).addTo(this.map);
//         });
//         // Handle results on the frontend (e.g., display on the map)
//       },
//       error: (err) => {
//         console.error('Query failed:', err);
//       }
//     });
//     });
//   }

//   // Handle file selection
//   onFileSelected(event: Event): void {
//     const input = event.target as HTMLInputElement;
//     if (input.files && input.files.length > 0) {
//       this.selectedFile = input.files[0];
//       console.log('File selected:', this.selectedFile.name);
//     }
//   }

//   // Handle file upload
//   onUpload(): void {
//     if (!this.selectedFile) return;

//     const formData = new FormData();
//     formData.append('file', this.selectedFile);

//     // Replace with your API endpoint
//     const uploadUrl = 'http://localhost:8000/upload';

//     this.http.post(uploadUrl, formData).subscribe({
//       next: (response) => {
//         console.log('File uploaded successfully:', response);
//       },
//       error: (err) => {
//         console.error('Error during file upload:', err);
//       }
//     });
//   }

//   // Handle the layer selection and display
//   onLayerSelected(event: Event): void {
//     const input = event.target as HTMLInputElement;
//     if (input.files && input.files.length > 0) {
//       const file = input.files[0];
//       const reader = new FileReader();
//       reader.onload = () => {
//         const layer = JSON.parse(reader.result as string);
//         L.geoJSON(layer).addTo(this.map);
//       };
//       reader.readAsText(file);
//     }
//   }
// }
