with open('src/App.jsx', 'r') as f:
    content = f.read()

# 1. Add imports
content = content.replace("import { Metas } from './modules/Metas';", "import { Metas } from './modules/Metas';\nimport { CRM } from './modules/CRM';\nimport { RH } from './modules/RH';")

# 2. Add CRM to tools/tabs
old_tabs = """            <button onClick={() => setActiveTab('hr')} className={`py-4 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'hr' ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><UserCheck className="w-4 h-4 inline mr-1" /> 6. RH</button>
            <button onClick={() => setActiveTab('tasks')} className={`py-4 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'tasks' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><CheckSquare className="w-4 h-4 inline mr-1" /> 7. Tarefas</button>"""

new_tabs = """            <button onClick={() => setActiveTab('hr')} className={`py-4 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'hr' ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><UserCheck className="w-4 h-4 inline mr-1" /> 6. RH</button>
            <button onClick={() => setActiveTab('tasks')} className={`py-4 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'tasks' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><CheckSquare className="w-4 h-4 inline mr-1" /> 7. Tarefas</button>
            <button onClick={() => setActiveTab('crm')} className={`py-4 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'crm' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><DollarSign className="w-4 h-4 inline mr-1" /> 8. CRM</button>"""

content = content.replace(old_tabs, new_tabs)

# 3. Remove HR states
hr_states = """  // --- RH State ---
  const [hrFilterYear, setHrFilterYear] = useState(new Date().getFullYear());
  const [hrFilterStore, setHrFilterStore] = useState('all');
  const [hrFilterStatus, setHrFilterStatus] = useState('all');
  const [hrSearch, setHrSearch] = useState('');
  const [hrShowForm, setHrShowForm] = useState(false);
  const [hrExpandedId, setHrExpandedId] = useState(null);
  const [draggedCandId, setDraggedCandId] = useState(null);
  const [hrEditId, setHrEditId] = useState(null);
  const [hrForm, setHrForm] = useState({
    nome: '', telefone: '', cargo: 'Vendedora', loja: 'all', status: 'triagem', fonte: '', motivo: '',
    recebimento_curriculo: new Date().toISOString().slice(0, 10),
    entrevista_data: '', contratacao_data: '', observacoes: ''
  });"""

content = content.replace(hr_states, "")

# 4. Replace HR block with new RH component. 
# Also add CRM component.
# The HR block starts with "{/* ═══════════════════ ABA RH ═══════════════════ */}"
hr_start = content.find("{/* ═══════════════════ ABA RH ═══════════════════ */}")
tasks_start = content.find("{activeTab === 'tasks' && (")

if hr_start != -1 and tasks_start != -1:
    
    new_components = """{/* ═══════════════════ ABA RH ═══════════════════ */}
        {activeTab === 'hr' && (
          <RH
            hrCandidates={hrCandidates}
            hrCollaborators={hrCollaborators}
            hrAbsences={hrAbsences}
            saveHrCandidate={saveHrCandidate}
            deleteHrCandidate={deleteHrCandidate}
            moveHrStatus={moveHrStatus}
            saveCollaborator={saveCollaborator}
            activateCollaboratorFromCandidate={activateCollaboratorFromCandidate}
            updateCollaboratorStatus={updateCollaboratorStatus}
            deleteCollaborator={deleteCollaborator}
            saveAbsence={saveAbsence}
            deleteAbsence={deleteAbsence}
            STORE_CONFIGS={STORE_CONFIGS}
            selectedStore={selectedStore}
            userRole={userRole}
          />
        )}

        {/* ═══════════════════ ABA CRM ═══════════════════ */}
        {activeTab === 'crm' && (
          <CRM
            crmLeads={crmLeads}
            saveCrmLead={saveCrmLead}
            moveCrmLeadStage={moveCrmLeadStage}
            deleteCrmLead={deleteCrmLead}
            selectedStore={selectedStore}
          />
        )}

        """
    content = content[:hr_start] + new_components + content[tasks_start:]

with open('src/App.jsx', 'w') as f:
    f.write(content)

print("Done")
