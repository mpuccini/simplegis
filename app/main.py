from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson.objectid import ObjectId
from bson.errors import InvalidId
import json
import logging
from pyproj import Transformer
from typing import List


logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
# Define projections
# utm = Proj(init="epsg:25833")  # UTM (adjust EPSG code if needed)
# wgs84 = Proj(init="epsg:4326")  # WGS 84 (longitude/latitude)

transformer = Transformer.from_crs("EPSG:25833", "EPSG:4326")


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],  # Angular app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Connection
client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client["gis_db"]
collection = db["geospatial_files"]


def check_and_transform_coordinates(coordinates):
    print(coordinates)
    lon, lat = coordinates

    if not (-180 <= lon <= 180) or not (-90 <= lat <= 90):
        try:
            lon, lat = transformer.transform(lon, lat)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to transform coordinates: {e}")
    return [lon, lat]
        
def transform_geometry(geometry: dict):
    if geometry["type"] == "Point" and len(geometry["coordinates"]) == 2:
        geometry["coordinates"] = check_and_transform_coordinates(geometry["coordinates"])

    elif geometry["type"] == "Polygon" or geometry["type"] == "MultiPolygon":
        transformed_coordinates = []
        for polygon in geometry["coordinates"]:
            transformed_polygon = []
            for ring in polygon:
                transformed_ring = []
                for point in ring:
                    print(point)
                    new_coordinates = check_and_transform_coordinates(point)
                    transformed_ring.append(new_coordinates)
                transformed_polygon.append(transformed_ring)
            transformed_coordinates.append(transformed_polygon)
        geometry["coordinates"] = transformed_coordinates

    return geometry

@app.post("/upload")   
async def upload_file(file: UploadFile = File(...)):
    if file.content_type != "application/json":
        raise HTTPException(status_code=400, detail="Only GeoJSON files are allowed")

    geojson_data = json.loads(await file.read())
    if "features" not in geojson_data:
        raise HTTPException(status_code=400, detail="Invalid GeoJSON format")

    documents = []
    for feature in geojson_data["features"]:
        if "geometry" in feature:
            geometry = feature["geometry"]

            geometry = transform_geometry(geometry)

        document = {
            "type": feature["type"],
            "id": feature["id"],
            "geometry": feature["geometry"],
            "properties": feature["properties"],
        }
        documents.append(document)

    await collection.insert_many(documents)

    return {"message": "File uploaded successfully"}


@app.post("/query")
async def query_region(region: dict):
    try:
        geometry = region.get("geometry")

        if geometry is None:
            raise ValueError("Invalid GeoJSON format: missing geometry field")



        if "type" not in geometry or "coordinates" not in geometry:
            raise ValueError("Invalid GeoJSON geometry format. 'type' and 'coordinates' are required.")
        
    # Query for files that intersect with the drawn region
        result = await collection.find({
            "geometry": {
                "$geoIntersects": {
                    "$geometry": geometry
                }
            }
        }).to_list(length=None)

        return {"features": result}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query failed: {e}")
    

@app.get("/layers")
async def get_layers():
    try:
        layers = await collection.find({}, {"_id":1, "properties.nome": 1, "properties.vincolo":1}).to_list(length=None)

        # Convert ObjectId to string
        for layer in layers:
            layer["_id"] = str(layer["_id"])

        return layers
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch layers: {e}")

@app.get("/layers/{layer_id}")
async def get_layer(layer_id: str):
    logger.debug(f"Received request for layer ID: {layer_id}")
    try:
        object_id = ObjectId(layer_id)
        logger.debug(f"Object ID: {object_id}")
    except InvalidId:
        logger.error(f"Invalid ObjectId conversion: {e}")
        raise HTTPException(status_code=400, detail="Invalid layer ID")
    
    # Query for the layer by its ID
    try:
        layer = await collection.find_one(
            {"_id": object_id}, 
            {"_id": 0, "geometry": 1, "properties": 1}
            )
        logger.debug(f"Layer: {layer}")
    except Exception as e:
        logger.error(f"Query error: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch layer: {e}")

    if not layer:
        logger.warning("Layer not found")
        raise HTTPException(status_code=404, detail="Layer not found")
    
    return layer

