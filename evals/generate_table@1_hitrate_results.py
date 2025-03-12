import os
import json

chunk_sizes = [1000, 1500, 2000, 2500]
num_fetch_vectors = [3, 5, 7, 9, 11, 13, 15]

paper_data_paths = [
    r"C:\Users\ssrap\Desktop\researchpal_v3\evals\data\aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzE3MDYuMDM3NjJ2Ny5wZGY=\eval data",
    r"C:\Users\ssrap\Desktop\researchpal_v3\evals\data\aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzI0MTAuMjEyMzZ2MS5wZGY=\eval data",
    r"C:\Users\ssrap\Desktop\researchpal_v3\evals\data\aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzI0MTIuMTgzMTl2Mi5wZGY=\eval data",
    r"C:\Users\ssrap\Desktop\researchpal_v3\evals\data\aHR0cHM6Ly9hcnhpdi5vcmcvcGRmLzI1MDIuMTAyNDh2MS5wZGY=\eval data"
]

table_hitrate_results = {}

for chunk_size in chunk_sizes:
    table_hitrate_results[chunk_size] = {}
    for k in num_fetch_vectors:
        table_hitrate_results[chunk_size][k] = 0

# table@1 hit-rate@k
for chunk_size in chunk_sizes:
    for k in num_fetch_vectors:
        curr_matches, total_elements = 0, 0
        for paper_data_path in paper_data_paths:
            true_json_path = os.path.join(paper_data_path, "tables", f"question_true_table@1.json")
            retrieved_json_path = os.path.join(paper_data_path, "tables", f"question_retrieved_table@1_{chunk_size}_{k}.json")
            true_json_data, retrieved_json_data = None, None
            with open(true_json_path, "r", encoding="utf-8") as f:
                true_json_data = json.load(f)
            with open(retrieved_json_path, "r", encoding="utf-8") as f:
                retrieved_json_data = json.load(f)
            assert len(true_json_data) == len(retrieved_json_data)
            for i in range(len(true_json_data)):
                curr_true_table_ids = true_json_data[i]['true_labels']
                curr_retrieved_table_ids = retrieved_json_data[i]['retrieved_table_ids']
                common_elements = set(curr_true_table_ids) & set(curr_retrieved_table_ids)
                num_common_elements = len(common_elements)
                if num_common_elements > 0:
                    curr_matches += 1
                total_elements += 1
        table_hitrate_results[chunk_size][k] = round(curr_matches / total_elements, 3)

save_path = r"C:\Users\ssrap\Desktop\researchpal_v3\evals\results\table@1_hitrate_results.json"
with open(save_path, "w", encoding="utf-8") as f:
    json.dump(table_hitrate_results, f, indent=4)