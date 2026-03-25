# MAPPING_SUPABASE — Nova Pareto OS · V26

> Gerado a partir do `useSupabase.js` atual. Use como referência canônica para integrações visuais.

---

## 1. Tabelas Ativas

| # | Tabela Supabase | Hook/Função | Operações |
|---|---|---|---|
| 1 | `system_data` | `setSystemDataForStore` | SELECT · DELETE · INSERT |
| 2 | `audit_data` | `updateAuditItem`, `seedAuditFromSystem` | SELECT · UPSERT |
| 3 | `sales_performance` | `upsertSalesHistory` | SELECT · DELETE · UPSERT |
| 4 | `dre_values` | `updateDreKey`, `deleteDreKey` | UPSERT · DELETE |
| 5 | `marketing_status` | `toggleMarketing` | UPSERT |
| 6 | `completed_ids` | `toggleCompleted` | UPSERT · DELETE |
| 7 | `user_config` | `setSellerOverride`, `updateProjectionSeller` | UPSERT |
| 8 | `candidates` | `saveHrCandidate`, `deleteHrCandidate`, `moveHrStatus` | SELECT · INSERT · UPDATE · DELETE |
| 9 | `tasks` | `saveTask`, `deleteTask`, `moveTaskStatus`, `moveTaskCamada` | SELECT · INSERT · UPDATE · DELETE |
| 10 | `crm_leads` | `saveCrmLead`, `moveCrmLeadStage`, `deleteCrmLead` | SELECT · INSERT · UPDATE · DELETE |
| 11 | `employees` | `saveCollaborator`, `updateCollaboratorStatus`, `activateCollaboratorFromCandidate`, `deleteCollaborator` | SELECT · INSERT · UPDATE · DELETE |
| 12 | `hr_absences` | `saveAbsence`, `deleteAbsence` | SELECT · INSERT · UPDATE · DELETE |

---

## 2. Colunas por Tabela

### `system_data`
| Coluna DB | Alias no Front | Tipo | Obrigatório |
|---|---|---|---|
| `id` | `_dbId` | uuid/int | auto |
| `user_id` | — | uuid | ✅ |
| `store_id` | `store_id` · `i.store_id` | text | ✅ |
| `item_id` | `id` | int | ✅ |
| `marca` | `MARCA` | text | — |
| `marcadesc` | `MARCADESC` | text | — |
| `tipodesc` | `TIPODESC` | text | — |
| `referencia` | `REFERENCIA` | text | — |
| `cor1desc` | `COR1DESC` | text | — |
| `dataentrada` | `DATAENTRADA` | text | — |
| `sizes` | `sizes` | jsonb `{tamanho: qty}` | ✅ |
| `qtde` | `QTDE` | int | — |

---

### `audit_data`
| Coluna DB | Alias no Front | Tipo | Obrigatório |
|---|---|---|---|
| `id` | `_dbId` | uuid/int | auto |
| `user_id` | — | uuid | ✅ |
| `store_id` | `store_id` | text | ✅ |
| `item_id` | `id` | int | ✅ |
| `referencia` | `REFERENCIA` | text | — |
| `sizes` | `sizes` | jsonb | ✅ |
| `qtde` | `QTDE` | int | auto-calculado |

> **Conflict:** `user_id, store_id, item_id`

---

### `sales_performance`
| Coluna DB | Alias camelCase (Front) | Tipo |
|---|---|---|
| `id` | `id` | uuid |
| `user_id` | — | uuid |
| `store_id` | `storeId` | text |
| `seller_code` | `sellerCode` | text |
| `seller_name` | `sellerName` | text |
| `days_worked` | `daysWorked` | int |
| `sales_count` | `salesCount` | int |
| `items_count` | `itemsCount` | int |
| `pa` | `pa` | numeric |
| `total_sales` | `totalSales` | numeric |
| `ticket_avg` | `ticketAvg` | numeric |
| `period` | `period` | text `YYYY-MM` |

> **Conflict:** `user_id, store_id, seller_name, period`

---

### `dre_values`
| Coluna DB | Tipo | Notas |
|---|---|---|
| `user_id` | uuid | ✅ |
| `dre_key` | text | Ex: `loja3_2025-03` |
| `values` | jsonb | `{aluguel: 0, luz: 0, ...}` |

> **Conflict:** `user_id, dre_key`

---

### `marketing_status`
| Coluna DB | Tipo |
|---|---|
| `user_id` | uuid |
| `store_id` | text ✅ V26 |
| `item_key` | text |
| `photo` | bool |
| `catalog` | bool |
| `posted` | bool |
| `discontinued` | bool |
| `posted_at` | timestamptz |

> **Conflict:** `user_id, store_id, item_key`

---

### `completed_ids`
| Coluna DB | Tipo |
|---|---|
| `user_id` | uuid |
| `store_id` | text ✅ V26 |
| `item_id` | int |

> **Conflict:** `user_id, store_id, item_id`
> **Chave composta no front:** `"${store_id}|${item_id}"`

---

### `user_config`
| Coluna DB | Tipo | Notas |
|---|---|---|
| `user_id` | uuid | ✅ |
| `config_key` | text | `proj_*` ou `seller_*` |
| `config_value` | jsonb | `{count: N}` ou `{status: "..."}` |

> **Conflict:** `user_id, config_key`

---

### `candidates` *(antigo hr_candidates)*
| Coluna DB | Tipo | Obrigatório |
|---|---|---|
| `id` | uuid | auto |
| `user_id` | uuid | ✅ |
| `store_id` | text ✅ V26 | ✅ |
| `nome` | text | ✅ |
| `telefone` | text | — |
| `cargo` | text | — |
| `fonte` | text | — |
| `status` | text | ✅ (ex: `triagem`, `contratado`) |
| `motivo` | text | — |
| `observacoes` | text | — |
| `recebimento_curriculo` | date | — |
| `entrevista_data` | date | — |
| `contratacao_data` | date | — |

---

### `tasks`
| Coluna DB | Tipo | Obrigatório |
|---|---|---|
| `id` | uuid | auto |
| `user_id` | uuid | ✅ |
| `store_id` | text | — (null se global) |
| `title` | text | ✅ |
| `status` | text | `To Do`, `In Progress`, `Done` |
| `sprint_id` | int | — |
| `project_id` | int | — |
| `frequency` | text | `diaria`, `semanal`, `mensal`, `scrum`, `nenhuma` |
| `priority` | text | `high`, `medium`, `low` |
| `due_date` | date | — |
| `description` | text | — |
| `total_subtasks` | int | — |
| `completed_subtasks` | int | — |
| `camada` | text | `braindump`, `quick_task`, `plano_acao` |
| `processado_em` | timestamptz | auto |

---

### `crm_leads`
| Coluna DB | Tipo | Obrigatório |
|---|---|---|
| `id` | uuid | auto |
| `user_id` | uuid | ✅ |
| `store_id` | text ✅ V26 | — |
| `nome` | text | ✅ |
| `telefone` | text | — |
| `produto_interesse` | text | — |
| `estagio` | text | `Triagem`, `Sondagem`, `Persona`, `Oferta`, `Ghosting` |
| `valor_estimado` | numeric | — |
| `origem` | text | — |
| `data_contato` | date | — |
| `data_ultimo_followup` | date | auto on move |
| `observacoes` | text | — |

---

### `employees` *(antigo hr_collaborators)*
| Coluna DB | Tipo | Obrigatório |
|---|---|---|
| `id` | uuid | auto |
| `user_id` | uuid | ✅ |
| `store_id` | text ✅ V26 | ✅ |
| `nome` | text | ✅ |
| `cargo` | text | — |
| `data_admissao` | date | ✅ |
| `status` | text | `ativo`, `ferias`, `afastado`, `desligado` |
| `salario` | numeric | — |
| `telefone` | text | — |
| `foto_url` | text | — |
| `lead_id` | uuid | FK → `candidates.id` |

---

### `hr_absences`
| Coluna DB | Tipo | Obrigatório |
|---|---|---|
| `id` | uuid | auto |
| `collaborator_id` | uuid | ✅ → FK `employees.id` |
| `tipo` | text | `ferias`, `atestado`, `falta`, `outro` |
| `data_inicio` | date | ✅ |
| `data_fim` | date | ✅ |
| `observacoes` | text | — |

---

## 3. Filtros por store_id — Status V26

| Tabela | Filtro de escrita | Filtro de leitura | Status |
|---|---|---|---|
| `system_data` | `.eq('store_id', storeId)` | `.order('store_id')` | ✅ V26 |
| `audit_data` | `store_id: storeId` em upsert | `.eq('store_id', storeId)` | ✅ V26 |
| `sales_performance` | `store_id: e.storeId` em rows | `.eq('store_id', clearStore)` | ✅ V26 |
| `marketing_status` | `store_id: storeId` em upsert | compositeKey `store_id\|item_key` | ✅ V26 |
| `completed_ids` | `store_id: storeId` em upsert | `.eq('store_id', storeId)` | ✅ V26 |
| `candidates` | `store_id: normalizeStoreCode(...)` | por `user_id` (global) | ✅ V26 |
| `tasks` | `store_id: normalizeStoreCode(...)` | por `user_id` (global) | ✅ V26 |
| `crm_leads` | `store_id: normalizeStoreCode(...)` | `.eq('user_id', userId)` | ✅ V26 |
| `employees` | `store_id: normalizeStoreCode(...)` | `.eq('user_id', userId)` | ✅ V26 |
| `hr_absences` | sem store_id (FK por collaborator_id) | sem filtro de loja | ✅ N/A |
| `dre_values` | sem store_id (chave = `dre_key`) | sem filtro de loja | ✅ N/A |

---

## 4. Funções Exportadas (useSupabase.js)

```
setSystemData           → setSystemDataForStore(storeId, parsedItems)
setAuditData            → seedAuditFromSystem(storeId, systemItems)
updateAuditItem         → (storeId, itemId, referencia, newSizes)
upsertSalesHistory      → (newEntries[], clearStore, clearPeriod)
updateDreKey            → (dreKey, field, value)
deleteDreKey            → (dreKey)
toggleMarketing         → (storeId, itemKey, field, currentVal)
toggleCompleted         → (storeId, itemId)
setSellerOverride       → (key, status)
saveHrCandidate         → (form, editId?)
deleteHrCandidate       → (id)
moveHrStatus            → (id, newStatus, extraFields?)
saveTask                → (taskForm, editId?)
deleteTask              → (id)
moveTaskStatus          → (id, newStatus)
moveTaskCamada          → (taskId, novaCamada, extraFields?)
saveCrmLead             → (form, editId?)
moveCrmLeadStage        → (id, newStage, extraFields?)
deleteCrmLead           → (id)
saveCollaborator        → (form, editId?)
activateCollaboratorFromCandidate → (candidate, { data_admissao, salario })
updateCollaboratorStatus → (id, newStatus)
deleteCollaborator      → (id)
saveAbsence             → (form, editId?)
deleteAbsence           → (id, collaboratorId)
reloadAll               → ()
```

---

## 5. Normalização Global

Toda leitura e escrita de `store_id` passa por `normalizeStoreCode()` (de `src/utils/formatters.js`), garantindo:
- `'03'` == `'3'` == `3` → padronizado como `'3'`
- Nunca envia `''` (string vazia); converte para `null`
