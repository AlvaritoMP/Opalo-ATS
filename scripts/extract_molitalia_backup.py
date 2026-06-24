import json
import os

TRANSCRIPT = r"C:\Users\alvaro\.cursor\projects\c-Users-alvaro-Opalo-ATS\agent-transcripts\bd3ec5cc-deb5-4c19-8791-972415b78605\bd3ec5cc-deb5-4c19-8791-972415b78605.jsonl"
OUT_JSON = r"C:\Users\alvaro\Opalo-ATS\backups\molitalia-bulk_config-2026-06-24-0920.json"
OUT_SQL = r"C:\Users\alvaro\Opalo-ATS\PASO_2_RESTAURAR_MOLITALIA.sql"

with open(TRANSCRIPT, encoding="utf-8") as f:
    line = f.readlines()[351]

obj = json.loads(line)
text = obj["message"]["content"][0]["text"]
start = text.find("[")
depth = 0
in_str = False
esc = False
end = None
for i, ch in enumerate(text[start:], start):
    if in_str:
        if esc:
            esc = False
        elif ch == "\\":
            esc = True
        elif ch == '"':
            in_str = False
        continue
    if ch == '"':
        in_str = True
    elif ch == "[":
        depth += 1
    elif ch == "]":
        depth -= 1
        if depth == 0:
            end = i + 1
            break

arr = json.loads(text[start:end])
bulk = arr[0]["bulk_config"]

os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
with open(OUT_JSON, "w", encoding="utf-8") as o:
    json.dump(bulk, o, ensure_ascii=False, indent=2)

bulk_json = json.dumps(bulk, ensure_ascii=False)
sql = f"""-- PASO 2 de 3: Restaurar Molitalia en PRODUCCION
-- Ejecuta TODO este archivo de una vez en el SQL Editor de Supabase (proyecto de produccion).
-- No toca candidatos. Solo reemplaza bulk_config de este proceso.

UPDATE processes
SET bulk_config = $molitalia_backup${bulk_json}$molitalia_backup$::jsonb
WHERE id = 'bdff73e0-616b-405a-9721-92b8516f0625'
  AND app_name = 'Opalo ATS';
"""

with open(OUT_SQL, "w", encoding="utf-8") as o:
    o.write(sql)

print("Wrote", OUT_JSON)
print("Wrote", OUT_SQL)
print("customColumns:", len(bulk.get("customColumns", [])))
print("quickReplies:", len(bulk.get("quickReplies", [])))
