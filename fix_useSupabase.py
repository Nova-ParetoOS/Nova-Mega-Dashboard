with open("src/useSupabase.js", "r") as f:
    text = f.read()

# Replace all occurrences of store_code with store_id to fully comply with DB normalization
text = text.replace("store_code", "store_id")
text = text.replace("storeCode", "storeId")

with open("src/useSupabase.js", "w") as f:
    f.write(text)

print("Replaced all store_code references with store_id in useSupabase.js")
