from pymongo import MongoClient
from bson import ObjectId

client = MongoClient("mongodb://localhost:27017")
db = client["gis_db"]
collection = db["geospatial_files"]

layer_id = "673b43d8b763be1fcbe64295"
try:
    result = collection.find_one({"_id": ObjectId(layer_id)})
    print("Result with ObjectId:", result)
except Exception as e:
    print("Error with ObjectId:", e)

# Test with string if needed
result_string = collection.find_one({"_id": layer_id})
print("Result with string:", result_string)
