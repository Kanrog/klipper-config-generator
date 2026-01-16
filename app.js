const REPO_OWNER = "Kanrog";
const REPO_NAME = "klipper-config-generator";
const CONFIG_FOLDER = "config-examples";

// Store the current config data globally
window.currentConfigData = {
    raw: '',
    sections: [],
    fileName: '',
    driverCount: 0,
    saveConfigBlock: '',
    defaultValues: {},
    includes: [],
    secondaryMcus: []  // Multi-MCU support
};

// Common include file presets
const INCLUDE_PRESETS = [
    { name: 'mainsail.cfg', description: 'Mainsail web interface macros' },
    { name: 'fluidd.cfg', description: 'Fluidd web interface macros' },
    { name: 'macros.cfg', description: 'Custom macro definitions' },
    { name: 'timelapse.cfg', description: 'Timelapse plugin configuration' },
    { name: 'KAMP_Settings.cfg', description: 'Klipper Adaptive Meshing & Purging' },
    { name: 'klipperscreen.cfg', description: 'KlipperScreen display settings' },
    { name: 'crowsnest.conf', description: 'Webcam streaming configuration' },
    { name: 'adxl.cfg', description: 'ADXL345 accelerometer configuration' },
    { name: 'ebb36.cfg', description: 'EBB36 CAN toolhead board' },
    { name: 'ebb42.cfg', description: 'EBB42 CAN toolhead board' },
    { name: 'sht36.cfg', description: 'Mellow SHT36 toolhead board' },
    { name: 'stealthburner_leds.cfg', description: 'Voron Stealthburner LED macros' },
];

// Secondary MCU presets
const SECONDARY_MCU_PRESETS = {
    'ebb36-v1.2': {
        name: 'BTT EBB36 v1.2',
        mcuName: 'EBBCan',
        type: 'toolhead',
        connectionType: 'canbus',
        description: 'BigTreeTech EBB36 CAN toolhead board',
        configFile: 'sample-bigtreetech-ebb-canbus-v1.2.cfg'
    },
    'ebb42-v1.2': {
        name: 'BTT EBB42 v1.2',
        mcuName: 'EBBCan',
        type: 'toolhead',
        connectionType: 'canbus',
        description: 'BigTreeTech EBB42 CAN toolhead board',
        configFile: 'sample-bigtreetech-ebb-canbus-v1.2.cfg'
    },
    'ebb36-v1.1': {
        name: 'BTT EBB36 v1.1',
        mcuName: 'EBBCan',
        type: 'toolhead',
        connectionType: 'canbus',
        description: 'BigTreeTech EBB36 v1.1 CAN toolhead',
        configFile: 'sample-bigtreetech-ebb-canbus-v1.1.cfg'
    },
    'ebb36-v1.0': {
        name: 'BTT EBB36 v1.0',
        mcuName: 'EBBCan',
        type: 'toolhead',
        connectionType: 'canbus',
        description: 'BigTreeTech EBB36 v1.0 CAN toolhead',
        configFile: 'sample-bigtreetech-ebb-canbus-v1.0.cfg'
    },
    'sht36': {
        name: 'Mellow SHT36/42',
        mcuName: 'sht',
        type: 'toolhead',
        connectionType: 'canbus',
        description: 'Mellow FLY-SHT36/42 CAN toolhead'
    },
    'rpi': {
        name: 'Raspberry Pi',
        mcuName: 'host',
        type: 'host',
        connectionType: 'linux',
        description: 'Raspberry Pi as secondary MCU for GPIO/sensors',
        configFile: 'sample-raspberry-pi.cfg'
    },
    'expansion': {
        name: 'Expansion Board',
        mcuName: 'mcu2',
        type: 'expansion',
        connectionType: 'usb',
        description: 'Additional printer board for more motors'
    },
    'mmu': {
        name: 'MMU/ERCF Board',
        mcuName: 'mmboard',
        type: 'mmu',
        connectionType: 'usb',
        description: 'Multi-material unit control board',
        configFile: 'sample-mmu2s-diy.cfg'
    },
    'duet-1lc': {
        name: 'Duet3 1LC',
        mcuName: 'toolboard',
        type: 'toolhead',
        connectionType: 'canbus',
        description: 'Duet3 1LC CAN toolboard',
        configFile: 'sample-duet3-1lc.cfg'
    }
};

// Kinematics definitions
const KINEMATICS = {
    cartesian: {
        name: 'Cartesian (Bed Slinger)',
        hint: 'Y axis moves the bed, X axis moves the toolhead',
        usesXYEndstops: true,
        usesDelta: false,
        klipperName: 'cartesian'
    },
    cartesian_xy: {
        name: 'Cartesian (Flying Gantry)',
        hint: 'Bed is stationary, X/Y axes move the toolhead',
        usesXYEndstops: true,
        usesDelta: false,
        klipperName: 'cartesian'
    },
    corexy: {
        name: 'CoreXY',
        hint: 'Bed moves on Z only, X/Y are belt-driven together',
        usesXYEndstops: true,
        usesDelta: false,
        klipperName: 'corexy'
    },
    corexz: {
        name: 'CoreXZ',
        hint: 'Y moves bed, X/Z are belt-driven together',
        usesXYEndstops: true,
        usesDelta: false,
        klipperName: 'corexz'
    },
    delta: {
        name: 'Delta',
        hint: 'Three towers, uses print radius instead of X/Y dimensions',
        usesXYEndstops: false,
        usesDelta: true,
        klipperName: 'delta'
    },
    deltesian: {
        name: 'Deltesian',
        hint: 'Hybrid delta/cartesian - two towers for X/Z, linear Y',
        usesXYEndstops: true,
        usesDelta: false,
        klipperName: 'deltesian'
    },
    polar: {
        name: 'Polar',
        hint: 'Rotating bed with radial arm',
        usesXYEndstops: false,
        usesDelta: true,
        klipperName: 'polar'
    },
    winch: {
        name: 'Cable Winch',
        hint: 'Experimental - cable-suspended toolhead',
        usesXYEndstops: false,
        usesDelta: false,
        klipperName: 'winch'
    }
};

// ============================================
// INCLUDE FILE MANAGEMENT
// ============================================

function extractIncludes(configText) {
    const includes = [];
    const lines = configText.split('\n');
    const includeRegex = /^(\s*#\s*)?\[include\s+([^\]]+)\]/i;
    
    for (const line of lines) {
        const match = line.match(includeRegex);
        if (match) {
            const isCommented = !!match[1];
            const fileName = match[2].trim();
            includes.push({
                fileName: fileName,
                enabled: !isCommented
            });
        }
    }
    
    return includes;
}

function renderIncludesUI() {
    const container = document.getElementById('includes-list');
    if (!container) return;
    
    const includes = window.currentConfigData.includes || [];
    let html = '';
    
    if (includes.length === 0) {
        html = '<div class="includes-empty">No include files added. Use the controls below to add common configs or enter a custom filename.</div>';
    } else {
        includes.forEach((inc, index) => {
            const preset = INCLUDE_PRESETS.find(p => p.name === inc.fileName);
            const description = preset ? preset.description : 'Custom include file';
            
            html += `
                <div class="include-item ${inc.enabled ? '' : 'disabled'}">
                    <input type="checkbox" 
                           id="include-${index}" 
                           ${inc.enabled ? 'checked' : ''} 
                           onchange="toggleInclude(${index})">
                    <div class="include-info">
                        <label for="include-${index}" class="include-name">${inc.fileName}</label>
                        <span class="include-desc">${description}</span>
                    </div>
                    <button type="button" class="include-remove" onclick="removeInclude(${index})" title="Remove">×</button>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
    updateIncludeCount();
}

function addInclude(fileName) {
    if (!fileName || fileName.trim() === '') return;
    
    fileName = fileName.trim();
    
    const exists = window.currentConfigData.includes.some(
        inc => inc.fileName.toLowerCase() === fileName.toLowerCase()
    );
    
    if (exists) {
        alert(`"${fileName}" is already in the include list.`);
        return;
    }
    
    window.currentConfigData.includes.push({
        fileName: fileName,
        enabled: true
    });
    
    renderIncludesUI();
    
    const customInput = document.getElementById('customIncludeInput');
    if (customInput) customInput.value = '';
    
    const presetSelect = document.getElementById('includePresetSelect');
    if (presetSelect) presetSelect.value = '';
}

function removeInclude(index) {
    window.currentConfigData.includes.splice(index, 1);
    renderIncludesUI();
}

function toggleInclude(index) {
    window.currentConfigData.includes[index].enabled = 
        !window.currentConfigData.includes[index].enabled;
    renderIncludesUI();
}

function toggleAllIncludes(enabled) {
    window.currentConfigData.includes.forEach(inc => {
        inc.enabled = enabled;
    });
    renderIncludesUI();
}

function updateIncludeCount() {
    const countEl = document.getElementById('includeCount');
    if (!countEl) return;
    
    const total = window.currentConfigData.includes.length;
    const enabled = window.currentConfigData.includes.filter(inc => inc.enabled).length;
    
    if (total === 0) {
        countEl.textContent = 'No includes';
    } else {
        countEl.textContent = `${enabled}/${total} enabled`;
    }
}

function handleIncludePresetSelect(select) {
    const value = select.value;
    if (value) {
        addInclude(value);
        select.value = '';
    }
}

function handleCustomIncludeAdd() {
    const input = document.getElementById('customIncludeInput');
    if (input && input.value.trim()) {
        addInclude(input.value.trim());
    }
}

function handleCustomIncludeKeypress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleCustomIncludeAdd();
    }
}

function generateIncludesBlock() {
    const includes = window.currentConfigData.includes || [];
    
    if (includes.length === 0) {
        return '';
    }
    
    let block = '#=====================================#\n';
    block += '#         INCLUDE FILES               #\n';
    block += '#=====================================#\n\n';
    
    for (const inc of includes) {
        if (inc.enabled) {
            block += `[include ${inc.fileName}]\n`;
        } else {
            block += `#[include ${inc.fileName}]\n`;
        }
    }
    
    return block;
}

// ============================================
// SECONDARY MCU MANAGEMENT
// ============================================

function addSecondaryMcuFromPreset(presetKey) {
    const preset = SECONDARY_MCU_PRESETS[presetKey];
    if (!preset) {
        console.error('Unknown MCU preset:', presetKey);
        return;
    }
    
    const id = 'mcu_' + Date.now();
    
    const mcu = {
        id: id,
        presetKey: presetKey,
        name: preset.mcuName,
        displayName: preset.name,
        type: preset.type,
        connectionType: preset.connectionType,
        description: preset.description,
        serial: preset.connectionType === 'canbus' ? '' : '/dev/serial/by-id/usb-Klipper_CHANGE_ME',
        canbus_uuid: preset.connectionType === 'canbus' ? '' : null,
        configFile: preset.configFile || null,
        configData: null,
        enabled: true,
        isCustomUpload: false
    };
    
    if (preset.type === 'expansion') {
        showExpansionBoardModal(mcu);
        return;
    }
    
    if (mcu.configFile) {
        loadSecondaryMcuConfig(mcu);
    }
    
    window.currentConfigData.secondaryMcus.push(mcu);
    renderSecondaryMcusUI();
}

function handleSecondaryMcuUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.cfg')) {
        alert('Please upload a .cfg file');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const configText = e.target.result;
        const id = 'mcu_' + Date.now();
        
        const mcuNameMatch = configText.match(/\[mcu\s+(\w+)\]/);
        const detectedName = mcuNameMatch ? mcuNameMatch[1] : 'mcu2';
        
        let connectionType = 'usb';
        if (configText.includes('canbus_uuid')) {
            connectionType = 'canbus';
        } else if (configText.includes('/tmp/klipper_host_mcu')) {
            connectionType = 'linux';
        }
        
        const mcu = {
            id: id,
            presetKey: null,
            name: detectedName,
            displayName: `📁 ${file.name}`,
            type: 'custom',
            connectionType: connectionType,
            description: `Uploaded config: ${file.name}`,
            serial: connectionType === 'canbus' ? '' : '/dev/serial/by-id/usb-Klipper_CHANGE_ME',
            canbus_uuid: connectionType === 'canbus' ? '' : null,
            configFile: file.name,
            configData: configText,
            enabled: true,
            isCustomUpload: true
        };
        
        window.currentConfigData.secondaryMcus.push(mcu);
        renderSecondaryMcusUI();
        
        event.target.value = '';
    };
    reader.readAsText(file);
}

async function loadSecondaryMcuConfig(mcu) {
    if (!mcu.configFile) return;
    
    try {
        const response = await fetch(`./${CONFIG_FOLDER}/${mcu.configFile}`);
        if (!response.ok) {
            console.warn(`Could not load config file: ${mcu.configFile}`);
            return;
        }
        
        const configText = await response.text();
        mcu.configData = configText;
        
        renderSecondaryMcusUI();
    } catch (error) {
        console.error('Error loading secondary MCU config:', error);
    }
}

function removeSecondaryMcu(mcuId) {
    const index = window.currentConfigData.secondaryMcus.findIndex(m => m.id === mcuId);
    if (index !== -1) {
        window.currentConfigData.secondaryMcus.splice(index, 1);
        renderSecondaryMcusUI();
    }
}

function toggleSecondaryMcu(mcuId) {
    const mcu = window.currentConfigData.secondaryMcus.find(m => m.id === mcuId);
    if (mcu) {
        mcu.enabled = !mcu.enabled;
        renderSecondaryMcusUI();
    }
}

function updateSecondaryMcuName(mcuId, newName) {
    const mcu = window.currentConfigData.secondaryMcus.find(m => m.id === mcuId);
    if (mcu) {
        mcu.name = newName.replace(/\s+/g, '_').toLowerCase();
        renderSecondaryMcusUI();
    }
}

function updateSecondaryMcuConnection(mcuId, value) {
    const mcu = window.currentConfigData.secondaryMcus.find(m => m.id === mcuId);
    if (mcu) {
        if (mcu.connectionType === 'canbus') {
            mcu.canbus_uuid = value;
        } else {
            mcu.serial = value;
        }
    }
}

function updateSecondaryMcuConnectionType(mcuId, connectionType) {
    const mcu = window.currentConfigData.secondaryMcus.find(m => m.id === mcuId);
    if (mcu) {
        mcu.connectionType = connectionType;
        if (connectionType === 'canbus') {
            mcu.canbus_uuid = '';
            mcu.serial = '';
        } else if (connectionType === 'linux') {
            mcu.serial = '/tmp/klipper_host_mcu';
            mcu.canbus_uuid = null;
        } else {
            mcu.serial = '/dev/serial/by-id/usb-Klipper_CHANGE_ME';
            mcu.canbus_uuid = null;
        }
        renderSecondaryMcusUI();
    }
}

function showExpansionBoardModal(mcu) {
    const modal = document.createElement('div');
    modal.className = 'mcu-modal-overlay';
    modal.id = 'expansionBoardModal';
    
    modal.innerHTML = `
        <div class="mcu-modal">
            <div class="mcu-modal-header">
                <h3>🔧 Add Expansion Board</h3>
                <button class="mcu-modal-close" onclick="closeExpansionBoardModal()">×</button>
            </div>
            <div class="mcu-modal-body">
                <p class="mcu-modal-description">
                    Select a board config from the list or upload your own .cfg file.
                    This board will be added as a secondary MCU for additional stepper drivers.
                </p>
                
                <div class="form-group">
                    <label>MCU Name (used in config)</label>
                    <input type="text" id="expansionMcuName" value="${mcu.name}" 
                           placeholder="e.g., z_mcu, mcu2, expansion">
                    <div class="hint">This name will prefix all pins, e.g., z_mcu:PA0</div>
                </div>
                
                <div class="form-group">
                    <label>Board Config</label>
                    <input type="text" id="expansionBoardSearch" placeholder="Search boards..." 
                           oninput="filterExpansionBoards()">
                    <select id="expansionBoardSelect" size="8" class="board-select-list">
                        <option value="">Loading boards...</option>
                    </select>
                </div>
                
                <div class="mcu-modal-divider">
                    <span>OR</span>
                </div>
                
                <div class="form-group">
                    <label class="file-upload-label expansion-upload">
                        <span>📁 Upload custom board .cfg</span>
                        <input type="file" accept=".cfg" id="expansionFileUpload">
                    </label>
                    <div id="expansionUploadedFile" class="uploaded-file-name"></div>
                </div>
            </div>
            <div class="mcu-modal-footer">
                <button class="btn btn-secondary" onclick="closeExpansionBoardModal()">Cancel</button>
                <button class="btn btn-primary" onclick="confirmExpansionBoard()">Add Board</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    window._pendingExpansionMcu = mcu;
    
    populateExpansionBoardList();
    
    document.getElementById('expansionFileUpload').addEventListener('change', handleExpansionFileSelect);
}

function populateExpansionBoardList() {
    const select = document.getElementById('expansionBoardSelect');
    if (!select || !window.boardOptions) return;
    
    select.innerHTML = '';
    
    window.boardOptions.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text;
        select.appendChild(option);
    });
}

function filterExpansionBoards() {
    const searchInput = document.getElementById('expansionBoardSearch');
    const select = document.getElementById('expansionBoardSelect');
    const filter = searchInput.value.toLowerCase();
    
    if (!window.boardOptions) return;
    
    select.innerHTML = '';
    
    const filtered = window.boardOptions.filter(opt => 
        opt.text.toLowerCase().includes(filter) || 
        opt.value.toLowerCase().includes(filter)
    );
    
    if (filtered.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'No matching boards found';
        option.disabled = true;
        select.appendChild(option);
    } else {
        filtered.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            select.appendChild(option);
        });
    }
}

function handleExpansionFileSelect(event) {
    const file = event.target.files[0];
    const uploadedDisplay = document.getElementById('expansionUploadedFile');
    
    if (file) {
        uploadedDisplay.textContent = `Selected: ${file.name}`;
        uploadedDisplay.style.display = 'block';
        
        document.getElementById('expansionBoardSelect').selectedIndex = -1;
        
        window._pendingExpansionFile = file;
    }
}

function closeExpansionBoardModal() {
    const modal = document.getElementById('expansionBoardModal');
    if (modal) {
        modal.remove();
    }
    window._pendingExpansionMcu = null;
    window._pendingExpansionFile = null;
}

async function confirmExpansionBoard() {
    const mcu = window._pendingExpansionMcu;
    if (!mcu) return;
    
    const mcuNameInput = document.getElementById('expansionMcuName');
    mcu.name = mcuNameInput.value.replace(/\s+/g, '_').toLowerCase() || 'mcu2';
    
    if (window._pendingExpansionFile) {
        const file = window._pendingExpansionFile;
        const reader = new FileReader();
        
        reader.onload = (e) => {
            mcu.configData = e.target.result;
            mcu.configFile = file.name;
            mcu.displayName = `📁 ${file.name}`;
            mcu.isCustomUpload = true;
            
            window.currentConfigData.secondaryMcus.push(mcu);
            renderSecondaryMcusUI();
            closeExpansionBoardModal();
        };
        
        reader.readAsText(file);
        return;
    }
    
    const boardSelect = document.getElementById('expansionBoardSelect');
    const selectedBoard = boardSelect.value;
    
    if (!selectedBoard) {
        alert('Please select a board or upload a config file.');
        return;
    }
    
    try {
        const response = await fetch(`./${CONFIG_FOLDER}/${selectedBoard}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }
        
        const configText = await response.text();
        mcu.configData = configText;
        mcu.configFile = selectedBoard;
        mcu.displayName = selectedBoard.replace('generic-', '').replace('.cfg', '').replace(/-/g, ' ').toUpperCase();
        
        window.currentConfigData.secondaryMcus.push(mcu);
        renderSecondaryMcusUI();
        closeExpansionBoardModal();
        
    } catch (error) {
        console.error('Error loading board config:', error);
        alert('Error loading board config. Check console for details.');
    }
}

function renderSecondaryMcusUI() {
    const container = document.getElementById('secondary-mcu-list');
    if (!container) return;
    
    const mcus = window.currentConfigData.secondaryMcus || [];
    
    if (mcus.length === 0) {
        container.innerHTML = '<div class="mcu-empty">No secondary MCUs added. Use the options below to add toolhead boards, expansion boards, or host MCU.</div>';
        updateSecondaryMcuCount();
        return;
    }
    
    let html = '';
    
    mcus.forEach((mcu) => {
        const connectionPlaceholder = mcu.connectionType === 'canbus' 
            ? 'e.g., 0e0d81e4210c' 
            : mcu.connectionType === 'linux'
            ? '/tmp/klipper_host_mcu'
            : '/dev/serial/by-id/usb-Klipper_...';
        
        const connectionValue = mcu.connectionType === 'canbus' 
            ? (mcu.canbus_uuid || '')
            : (mcu.serial || '');
        
        const typeIcon = {
            'toolhead': '🔧',
            'expansion': '📦',
            'host': '🖥️',
            'mmu': '🎨',
            'custom': '📁'
        }[mcu.type] || '📦';
        
        html += `
            <div class="mcu-item ${mcu.enabled ? '' : 'disabled'}" data-mcu-id="${mcu.id}">
                <div class="mcu-item-header">
                    <div class="mcu-item-title">
                        <input type="checkbox" 
                               id="mcu-enable-${mcu.id}" 
                               ${mcu.enabled ? 'checked' : ''} 
                               onchange="toggleSecondaryMcu('${mcu.id}')">
                        <span class="mcu-type-icon">${typeIcon}</span>
                        <span class="mcu-display-name">${mcu.displayName}</span>
                    </div>
                    <button class="mcu-remove-btn" onclick="removeSecondaryMcu('${mcu.id}')" title="Remove">×</button>
                </div>
                
                <div class="mcu-item-body">
                    <div class="mcu-field">
                        <label>MCU Name</label>
                        <input type="text" 
                               value="${mcu.name}" 
                               onchange="updateSecondaryMcuName('${mcu.id}', this.value)"
                               placeholder="e.g., EBBCan, z_mcu">
                        <div class="hint">Used as pin prefix: ${mcu.name}:PA0</div>
                    </div>
                    
                    <div class="mcu-field">
                        <label>Connection Type</label>
                        <select onchange="updateSecondaryMcuConnectionType('${mcu.id}', this.value)">
                            <option value="usb" ${mcu.connectionType === 'usb' ? 'selected' : ''}>USB Serial</option>
                            <option value="canbus" ${mcu.connectionType === 'canbus' ? 'selected' : ''}>CAN Bus</option>
                            <option value="linux" ${mcu.connectionType === 'linux' ? 'selected' : ''}>Linux MCU (RPi)</option>
                        </select>
                    </div>
                    
                    <div class="mcu-field">
                        <label>${mcu.connectionType === 'canbus' ? 'CAN Bus UUID' : 'Serial Port'}</label>
                        <input type="text" 
                               value="${connectionValue}" 
                               onchange="updateSecondaryMcuConnection('${mcu.id}', this.value)"
                               placeholder="${connectionPlaceholder}"
                               ${mcu.connectionType === 'linux' ? 'readonly' : ''}>
                    </div>
                    
                    ${mcu.configFile ? `
                        <div class="mcu-config-info">
                            <span class="mcu-config-label">Config:</span>
                            <span class="mcu-config-file">${mcu.configFile}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    updateSecondaryMcuCount();
}

function updateSecondaryMcuCount() {
    const countEl = document.getElementById('secondaryMcuCount');
    if (!countEl) return;
    
    const total = window.currentConfigData.secondaryMcus.length;
    const enabled = window.currentConfigData.secondaryMcus.filter(m => m.enabled).length;
    
    if (total === 0) {
        countEl.textContent = '0';
    } else {
        countEl.textContent = `${enabled}/${total}`;
    }
}

function handleSecondaryMcuPresetSelect(select) {
    const value = select.value;
    if (value) {
        addSecondaryMcuFromPreset(value);
        select.value = '';
    }
}

function generateSecondaryMcuBlocks() {
    const mcus = window.currentConfigData.secondaryMcus.filter(m => m.enabled);
    
    if (mcus.length === 0) {
        return '';
    }
    
    let output = '\n#=====================================#\n';
    output += '#       SECONDARY MCU CONFIGS         #\n';
    output += '#=====================================#\n\n';
    
    for (const mcu of mcus) {
        output += `[mcu ${mcu.name}]\n`;
        
        if (mcu.connectionType === 'canbus') {
            output += `canbus_uuid: ${mcu.canbus_uuid || 'PASTE_YOUR_UUID_HERE'}\n`;
        } else if (mcu.connectionType === 'linux') {
            output += `serial: /tmp/klipper_host_mcu\n`;
        } else {
            output += `serial: ${mcu.serial || '/dev/serial/by-id/usb-Klipper_CHANGE_ME'}\n`;
        }
        output += '\n';
        
        if (mcu.configFile) {
            output += `# Config based on: ${mcu.configFile}\n`;
        }
        if (mcu.description) {
            output += `# ${mcu.description}\n`;
        }
        output += `# Remember to prefix all pins with "${mcu.name}:" when using this MCU\n`;
        output += `# Example: step_pin: ${mcu.name}:PB13\n`;
        output += '\n';
    }
    
    return output;
}

// ============================================
// STEPPER DRIVER COUNTING
// ============================================

function countStepperDrivers(configText) {
    if (!configText) return 0;
    
    const lines = configText.split('\n');
    
    const tmcSections = new Set();
    const tmcPattern = /^#*\s*\[(tmc\d+)\s+(stepper_[xyzabc]\d*|extruder\d*)\]/i;
    
    for (const line of lines) {
        const match = line.trim().match(tmcPattern);
        if (match) {
            const stepperName = match[2].toLowerCase();
            tmcSections.add(stepperName);
        }
    }
    
    if (tmcSections.size > 0) {
        return tmcSections.size;
    }
    
    const boardPatterns = [
        { pattern: /skr.*mini.*e3/i, drivers: 4 },
        { pattern: /skr.*1\.3/i, drivers: 5 },
        { pattern: /skr.*1\.4/i, drivers: 5 },
        { pattern: /skr.*2/i, drivers: 5 },
        { pattern: /skr.*pro/i, drivers: 6 },
        { pattern: /skr.*octopus/i, drivers: 8 },
        { pattern: /spider/i, drivers: 8 },
        { pattern: /manta.*m8p/i, drivers: 8 },
        { pattern: /manta.*m5p/i, drivers: 5 },
        { pattern: /fysetc.*s6/i, drivers: 6 },
        { pattern: /fysetc.*spider/i, drivers: 8 },
        { pattern: /ender.*3/i, drivers: 4 },
        { pattern: /ender.*5/i, drivers: 5 },
        { pattern: /ramps/i, drivers: 5 },
        { pattern: /mega.*2560/i, drivers: 5 },
        { pattern: /rumba/i, drivers: 6 },
        { pattern: /duet.*2/i, drivers: 5 },
        { pattern: /duet.*3/i, drivers: 6 },
    ];
    
    const headerText = lines.slice(0, 50).join('\n');
    for (const { pattern, drivers } of boardPatterns) {
        if (pattern.test(headerText)) {
            return drivers;
        }
    }
    
    const allStepperSections = new Set();
    const stepperPattern = /^#*\s*\[(?:stepper_[xyzabc]\d*|extruder\d*)\]/i;
    
    for (const line of lines) {
        const match = line.trim().match(stepperPattern);
        if (match) {
            const normalized = match[0]
                .replace(/^#*\s*\[/, '')
                .replace(/\]/, '')
                .toLowerCase();
            allStepperSections.add(normalized);
        }
    }
    
    if (allStepperSections.size > 0) {
        return allStepperSections.size;
    }
    
    return 4;
}

function calculateRequiredDrivers() {
    const kinematicsSelect = document.getElementById('kinematicsSelect');
    const zMotorCount = parseInt(document.getElementById('zMotorCount').value);
    const kinematics = KINEMATICS[kinematicsSelect.value];
    
    let required = 0;
    
    if (kinematics.usesDelta) {
        required = 3;
    } else {
        required = 2;
    }
    
    if (!kinematics.usesDelta) {
        required += zMotorCount;
    }
    
    required += 1;
    
    return required;
}

function updateDriverWarning() {
    const required = calculateRequiredDrivers();
    const available = window.currentConfigData.driverCount;
    
    let driverCountEl = document.getElementById('driverCountDisplay');
    if (!driverCountEl && available > 0) {
        driverCountEl = document.createElement('div');
        driverCountEl.id = 'driverCountDisplay';
        driverCountEl.className = 'driver-count-display';
        
        const zMotorsGroup = document.getElementById('zMotorsGroup');
        const label = zMotorsGroup.querySelector('label');
        label.parentNode.insertBefore(driverCountEl, label.nextSibling);
    }
    
    if (driverCountEl) {
        const remaining = available - required;
        const statusClass = remaining >= 0 ? 'ok' : 'warning';
        driverCountEl.innerHTML = `
            <div class="driver-count ${statusClass}">
                <span class="count-label">Board has:</span>
                <span class="count-value">${available} drivers</span>
                <span class="count-separator">|</span>
                <span class="count-label">Required:</span>
                <span class="count-value">${required} drivers</span>
                <span class="count-separator">|</span>
                <span class="count-label">Available:</span>
                <span class="count-value ${remaining >= 0 ? 'count-ok' : 'count-warning'}">${remaining} drivers</span>
            </div>
        `;
    }
    
    let warningEl = document.getElementById('driverWarning');
    
    if (required > available && available > 0) {
        if (!warningEl) {
            warningEl = document.createElement('div');
            warningEl.id = 'driverWarning';
            warningEl.className = 'driver-warning';
            
            const zMotorsGroup = document.getElementById('zMotorsGroup');
            zMotorsGroup.parentNode.insertBefore(warningEl, zMotorsGroup.nextSibling);
        }
        
        warningEl.innerHTML = `
            <div class="warning-icon">⚠️</div>
            <div class="warning-content">
                <strong>Insufficient Stepper Drivers</strong>
                <p>This configuration requires <strong>${required} drivers</strong> but the selected board only has <strong>${available} drivers</strong>.</p>
                <p>Add a <strong>Secondary MCU</strong> below for additional motor outputs.</p>
            </div>
        `;
        warningEl.style.display = 'flex';
    } else if (warningEl) {
        warningEl.style.display = 'none';
    }
}

function updateKinematicsOptions() {
    const kinematicsSelect = document.getElementById('kinematicsSelect');
    const selected = kinematicsSelect.value;
    const kinematics = KINEMATICS[selected];
    
    document.getElementById('kinematicsHint').textContent = kinematics.hint;
    
    const cartesianDims = document.getElementById('cartesianDimensions');
    const deltaDims = document.getElementById('deltaDimensions');
    const dimLabel = document.getElementById('bedDimensionsLabel');
    
    if (kinematics.usesDelta) {
        cartesianDims.style.display = 'none';
        deltaDims.style.display = 'grid';
        dimLabel.textContent = 'Print Area (Radius / Height mm)';
    } else {
        cartesianDims.style.display = 'grid';
        deltaDims.style.display = 'none';
        dimLabel.textContent = 'Bed Dimensions (X / Y / Z mm)';
    }
    
    const xyEndstopOptions = document.getElementById('xyEndstopOptions');
    if (kinematics.usesXYEndstops) {
        xyEndstopOptions.style.display = 'block';
    } else {
        xyEndstopOptions.style.display = 'none';
    }
    
    if (selected === 'delta') {
        document.getElementById('zEndstopType').value = 'switch_max';
        updateZEndstopOptions();
    }
    
    const zMotorsGroup = document.getElementById('zMotorsGroup');
    if (kinematics.usesDelta) {
        zMotorsGroup.style.display = 'none';
    } else {
        zMotorsGroup.style.display = 'block';
    }
    
    updateDriverWarning();
}

function updateSensorlessWarning() {
    const sensorlessCheckbox = document.getElementById('sensorlessXY');
    const defaults = window.currentConfigData?.defaultValues || {};
    
    let warningEl = document.getElementById('sensorlessWarning');
    if (warningEl) {
        warningEl.remove();
    }
    
    if (!sensorlessCheckbox.checked && (!defaults.hasPhysicalEndstopX || !defaults.hasPhysicalEndstopY)) {
        warningEl = document.createElement('div');
        warningEl.id = 'sensorlessWarning';
        warningEl.className = 'sensorless-warning';
        
        const missingEndstops = [];
        if (!defaults.hasPhysicalEndstopX) missingEndstops.push('X');
        if (!defaults.hasPhysicalEndstopY) missingEndstops.push('Y');
        
        warningEl.innerHTML = `
            <div class="warning-icon">⚠️</div>
            <div class="warning-content">
                <strong>Missing Physical Endstops</strong>
                <p>This config appears to use sensorless homing (no physical endstop pins defined for ${missingEndstops.join(' and ')} axis).</p>
                <p>If you disable sensorless homing, you'll need to manually add <code>endstop_pin</code> definitions to the stepper sections, or keep sensorless homing enabled.</p>
            </div>
        `;
        
        const checkbox = document.querySelector('.checkbox-row:has(#sensorlessXY)');
        if (checkbox) {
            checkbox.parentNode.insertBefore(warningEl, checkbox.nextSibling);
        }
    }
}

function updateZMotorOptions() {
    const count = parseInt(document.getElementById('zMotorCount').value);
    const zTiltOptions = document.getElementById('zTiltOptions');
    const quadGantryOptions = document.getElementById('quadGantryOptions');
    
    zTiltOptions.style.display = 'none';
    quadGantryOptions.style.display = 'none';
    
    if (count === 2 || count === 3) {
        zTiltOptions.style.display = 'block';
    } else if (count === 4) {
        quadGantryOptions.style.display = 'block';
    }
    
    updateDriverWarning();
}

function updateZEndstopOptions() {
    const zEndstopType = document.getElementById('zEndstopType').value;
    const probeOffsets = document.getElementById('probeOffsets');
    
    if (zEndstopType === 'probe') {
        probeOffsets.style.display = 'grid';
    } else {
        probeOffsets.style.display = 'none';
    }
}

// ============================================
// CONFIG LOADING AND PARSING
// ============================================

window.onload = async () => {
    const select = document.getElementById('boardSelect');
    const searchInput = document.getElementById('boardSearch');
    
    renderIncludesUI();
    renderSecondaryMcusUI();
    
    try {
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${CONFIG_FOLDER}`);
        const files = await response.json();

        window.boardOptions = [];
        
        select.innerHTML = '';
        files.forEach(file => {
            if (file.name.endsWith('.cfg')) {
                const option = document.createElement('option');
                option.value = file.name;
                option.textContent = file.name
                    .replace('generic-', '')
                    .replace('.cfg', '')
                    .replace(/-/g, ' ')
                    .toUpperCase();
                select.appendChild(option);
                
                window.boardOptions.push({
                    value: file.name,
                    text: option.textContent
                });
            }
        });
        
        searchInput.disabled = false;
        searchInput.placeholder = 'Search boards...';
        
        if (select.value) {
            loadConfigFromRepo(select.value);
        }
        
    } catch (err) {
        select.innerHTML = '<option>Error loading repo files</option>';
        console.error(err);
    }
};

function filterBoards() {
    const searchInput = document.getElementById('boardSearch');
    const select = document.getElementById('boardSelect');
    const filter = searchInput.value.toLowerCase();
    
    if (!window.boardOptions) return;
    
    select.innerHTML = '';
    
    const filtered = window.boardOptions.filter(opt => 
        opt.text.toLowerCase().includes(filter) || 
        opt.value.toLowerCase().includes(filter)
    );
    
    if (filtered.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'No matching boards found';
        option.disabled = true;
        select.appendChild(option);
    } else {
        filtered.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            select.appendChild(option);
        });
    }
}

async function loadConfigFromRepo(fileName) {
    try {
        const response = await fetch(`./${CONFIG_FOLDER}/${fileName}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }
        const configText = await response.text();
        processConfig(configText, fileName);
    } catch (error) {
        console.error('Error loading config:', error);
        alert('Error loading config file. Check console for details.');
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.cfg')) {
        alert('Please upload a .cfg file');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const configText = e.target.result;
        processConfig(configText, file.name);
        
        document.getElementById('uploadedFileName').textContent = `Loaded: ${file.name}`;
        document.getElementById('uploadedFileName').style.display = 'block';
        
        const select = document.getElementById('boardSelect');
        const option = document.createElement('option');
        option.value = '__uploaded__';
        option.textContent = `📁 ${file.name} (uploaded)`;
        option.selected = true;
        select.insertBefore(option, select.firstChild);
    };
    reader.readAsText(file);
}

function processConfig(configText, fileName) {
    const sections = parseConfigSections(configText);
    const driverCount = countStepperDrivers(configText);
    const saveConfigBlock = extractSaveConfig(configText);
    const savedValues = parseSavedValues(saveConfigBlock);
    const defaultValues = extractDefaultValues(configText, sections);
    const includes = extractIncludes(configText);
    
    window.currentConfigData = {
        raw: configText,
        sections: sections,
        fileName: fileName,
        driverCount: driverCount,
        saveConfigBlock: saveConfigBlock,
        savedValues: savedValues,
        defaultValues: defaultValues,
        includes: includes,
        secondaryMcus: window.currentConfigData.secondaryMcus || []
    };
    
    populateDefaultValues(defaultValues);
    renderSectionCheckboxes(sections);
    renderIncludesUI();
    renderSecondaryMcusUI();
    updateDriverWarning();
    updateSensorlessWarning();
}

function populateDefaultValues(defaults) {
    if (defaults.kinematics) {
        const kinematicsSelect = document.getElementById('kinematicsSelect');
        for (const [key, value] of Object.entries(KINEMATICS)) {
            if (value.klipperName === defaults.kinematics) {
                kinematicsSelect.value = key;
                updateKinematicsOptions();
                break;
            }
        }
    }
    
    const isDelta = defaults.kinematics === 'delta';
    
    if (isDelta) {
        if (defaults.deltaRadius) {
            document.getElementById('deltaRadius').value = defaults.deltaRadius;
            document.getElementById('deltaRadius').placeholder = `Default: ${defaults.deltaRadius}`;
        }
        if (defaults.deltaHeight) {
            document.getElementById('deltaHeight').value = defaults.deltaHeight;
            document.getElementById('deltaHeight').placeholder = `Default: ${defaults.deltaHeight}`;
        }
        if (defaults.deltaArmLength) {
            document.getElementById('deltaArmLength').value = defaults.deltaArmLength;
        }
    } else {
        if (defaults.bedX) {
            document.getElementById('bedX').value = defaults.bedX;
            document.getElementById('bedX').placeholder = `Default: ${defaults.bedX}`;
        }
        if (defaults.bedY) {
            document.getElementById('bedY').value = defaults.bedY;
            document.getElementById('bedY').placeholder = `Default: ${defaults.bedY}`;
        }
        if (defaults.bedZ) {
            document.getElementById('bedZ').value = defaults.bedZ;
            document.getElementById('bedZ').placeholder = `Default: ${defaults.bedZ}`;
        }
    }
    
    if (defaults.probeOffsetX !== undefined) {
        document.getElementById('probeOffsetX').value = defaults.probeOffsetX;
        document.getElementById('probeOffsetX').placeholder = `Default: ${defaults.probeOffsetX}`;
    }
    if (defaults.probeOffsetY !== undefined) {
        document.getElementById('probeOffsetY').value = defaults.probeOffsetY;
        document.getElementById('probeOffsetY').placeholder = `Default: ${defaults.probeOffsetY}`;
    }
}

function extractSaveConfig(configText) {
    const lines = configText.split('\n');
    const saveConfigStart = lines.findIndex(line => 
        line.includes('#*# <---------------------- SAVE_CONFIG ---------------------->')
    );
    
    if (saveConfigStart === -1) {
        return '';
    }
    
    const saveConfigLines = lines.slice(saveConfigStart);
    return saveConfigLines.join('\n');
}

function parseSavedValues(saveConfigBlock) {
    const savedValues = {};
    if (!saveConfigBlock) return savedValues;
    
    const lines = saveConfigBlock.split('\n');
    let currentSection = null;
    
    for (const line of lines) {
        const sectionMatch = line.match(/^#\*#\s*\[([^\]]+)\]/);
        if (sectionMatch) {
            currentSection = sectionMatch[1].toLowerCase();
            continue;
        }
        
        const valueMatch = line.match(/^#\*#\s*([a-z_]+)\s*=\s*(.+)$/);
        if (valueMatch && currentSection) {
            const key = `${currentSection}.${valueMatch[1]}`;
            savedValues[key] = valueMatch[2].trim();
        }
    }
    
    return savedValues;
}

function parseConfigSections(configText) {
    const sections = [];
    const lines = configText.split('\n');
    const sectionRegex = /^(\s*#\s*)?\[([^\]]+)\]/;
    
    let currentSection = null;
    
    const saveConfigStart = lines.findIndex(line => 
        line.includes('#*# <---------------------- SAVE_CONFIG ---------------------->')
    );
    const parseUntil = saveConfigStart !== -1 ? saveConfigStart : lines.length;
    
    for (let i = 0; i < parseUntil; i++) {
        const line = lines[i];
        const match = line.match(sectionRegex);
        
        if (match) {
            if (currentSection) {
                currentSection.endLine = i - 1;
                currentSection.content = extractSectionContent(lines, currentSection.startLine, currentSection.endLine);
                sections.push(currentSection);
            }
            
            const isCommented = !!match[1];
            const sectionName = match[2].trim();
            
            if (sectionName.toLowerCase().startsWith('include ') || sectionName.toLowerCase() === 'include') {
                currentSection = null;
                continue;
            }
            
            currentSection = {
                name: sectionName,
                enabled: !isCommented,
                startLine: i,
                endLine: null,
                content: null,
                originallyCommented: isCommented
            };
        }
    }
    
    if (currentSection) {
        currentSection.endLine = parseUntil - 1;
        currentSection.content = extractSectionContent(lines, currentSection.startLine, currentSection.endLine);
        sections.push(currentSection);
    }
    
    return sections;
}

function extractSectionContent(lines, startLine, endLine) {
    while (endLine > startLine && lines[endLine].trim() === '') {
        endLine--;
    }
    
    let content = lines.slice(startLine, endLine + 1).join('\n');
    
    return content.trim();
}

function extractDefaultValues(configText, sections) {
    const defaults = {};
    
    const printer = sections.find(s => s.name.toLowerCase() === 'printer');
    if (printer) {
        const match = printer.content.match(/kinematics:\s*(\w+)/);
        if (match) defaults.kinematics = match[1].toLowerCase();
    }
    
    const isDelta = defaults.kinematics === 'delta';
    
    defaults.hasPhysicalEndstopX = false;
    defaults.hasPhysicalEndstopY = false;
    defaults.hasPhysicalEndstopZ = false;
    
    const stepperX = sections.find(s => s.name.toLowerCase() === 'stepper_x');
    const stepperY = sections.find(s => s.name.toLowerCase() === 'stepper_y');
    const stepperZ = sections.find(s => s.name.toLowerCase() === 'stepper_z');
    
    if (stepperX) {
        const endstopMatch = stepperX.content.match(/(?:^|#\s*)endstop_pin:\s*([^#\n]+)/m);
        if (endstopMatch) {
            const pin = endstopMatch[1].trim();
            if (!pin.includes('virtual_endstop') && !pin.includes('probe:')) {
                defaults.hasPhysicalEndstopX = true;
            }
        }
    }
    
    if (stepperY) {
        const endstopMatch = stepperY.content.match(/(?:^|#\s*)endstop_pin:\s*([^#\n]+)/m);
        if (endstopMatch) {
            const pin = endstopMatch[1].trim();
            if (!pin.includes('virtual_endstop') && !pin.includes('probe:')) {
                defaults.hasPhysicalEndstopY = true;
            }
        }
    }
    
    if (stepperZ) {
        const endstopMatch = stepperZ.content.match(/(?:^|#\s*)endstop_pin:\s*([^#\n]+)/m);
        if (endstopMatch) {
            const pin = endstopMatch[1].trim();
            if (!pin.includes('virtual_endstop') && !pin.includes('probe:')) {
                defaults.hasPhysicalEndstopZ = true;
            }
        }
    }
    
    if (isDelta) {
        const stepperA = sections.find(s => s.name.toLowerCase() === 'stepper_a');
        
        if (stepperA) {
            const armMatch = stepperA.content.match(/arm_length:\s*([\d.]+)/);
            if (armMatch) defaults.deltaArmLength = parseFloat(armMatch[1]);
        }
        
        if (printer) {
            const radiusMatch = printer.content.match(/print_radius:\s*([\d.]+)/);
            if (radiusMatch) defaults.deltaRadius = parseFloat(radiusMatch[1]);
            
            if (stepperA) {
                const endstopMatch = stepperA.content.match(/position_endstop:\s*([\d.]+)/);
                if (endstopMatch) defaults.deltaHeight = parseFloat(endstopMatch[1]);
            }
        }
        
    } else {
        if (stepperX) {
            const match = stepperX.content.match(/position_max:\s*([\d.]+)/);
            if (match) defaults.bedX = parseInt(match[1]);
        }
        
        if (stepperY) {
            const match = stepperY.content.match(/position_max:\s*([\d.]+)/);
            if (match) defaults.bedY = parseInt(match[1]);
        }
        
        if (stepperZ) {
            const match = stepperZ.content.match(/position_max:\s*([\d.]+)/);
            if (match) defaults.bedZ = parseInt(match[1]);
        }
    }
    
    const probe = sections.find(s => 
        s.name.toLowerCase() === 'probe' || 
        s.name.toLowerCase() === 'bltouch'
    );
    if (probe) {
        const xMatch = probe.content.match(/x_offset:\s*([-\d.]+)/);
        const yMatch = probe.content.match(/y_offset:\s*([-\d.]+)/);
        if (xMatch) defaults.probeOffsetX = parseFloat(xMatch[1]);
        if (yMatch) defaults.probeOffsetY = parseFloat(yMatch[1]);
    }
    
    return defaults;
}

// ============================================
// SECTION RENDERING AND UI
// ============================================

function categorizeSection(sectionName) {
    const name = sectionName.toLowerCase();
    
    if (name.startsWith('stepper_')) return 'Steppers';
    if (name.startsWith('tmc2209') || name.startsWith('tmc2130') || name.startsWith('tmc5160') || name.startsWith('tmc2208')) return 'TMC Drivers';
    if (name.includes('extruder')) return 'Extruders';
    if (name.includes('fan') || name === 'fan') return 'Fans';
    if (name.includes('heater') || name === 'heater_bed') return 'Heaters';
    if (name.includes('probe') || name === 'bltouch' || name === 'safe_z_home' || name === 'bed_mesh') return 'Probing';
    if (name.includes('sensor') || name === 'adxl345' || name.includes('resonance')) return 'Sensors';
    if (name.includes('neopixel') || name.includes('led') || name.includes('dotstar')) return 'Lighting';
    if (name === 'mcu' || name.startsWith('mcu ')) return 'MCU';
    if (name === 'printer' || name === 'board_pins' || name === 'virtual_sdcard' || name === 'display') return 'Core';
    if (name.includes('output_pin') || name.includes('pin')) return 'Pins';
    if (name.includes('gcode_macro') || name.includes('macro')) return 'Macros';
    if (name.includes('menu')) return 'Menu';
    
    return 'Other';
}

function renderSectionCheckboxes(sections) {
    const container = document.getElementById('sections-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (sections.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary); padding: 40px;">No sections found in config file.</div>';
        return;
    }
    
    const categories = {};
    sections.forEach((section, index) => {
        const category = categorizeSection(section.name);
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push({ ...section, index });
    });
    
    const categoryOrder = [
        'Core', 'MCU', 'Steppers', 'TMC Drivers', 'Extruders', 
        'Heaters', 'Fans', 'Probing', 'Sensors', 'Lighting', 'Pins', 'Macros', 'Menu', 'Other'
    ];
    
    categoryOrder.forEach(category => {
        if (!categories[category] || categories[category].length === 0) return;
        
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'section-category';
        categoryDiv.dataset.category = category;
        
        const header = document.createElement('div');
        header.className = 'section-category-header';
        header.innerHTML = `
            <span>${category} (${categories[category].length})</span>
            <span class="category-toggle" title="Toggle all">⊟</span>
        `;
        header.onclick = () => toggleCategory(category);
        categoryDiv.appendChild(header);
        
        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'section-items';
        
        categories[category].forEach(section => {
            const div = document.createElement('div');
            div.className = 'section-item';
            div.dataset.category = category;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `section-${section.index}`;
            checkbox.value = section.index;
            checkbox.checked = section.enabled;
            checkbox.dataset.sectionName = section.name;
            
            const label = document.createElement('label');
            label.htmlFor = `section-${section.index}`;
            label.textContent = section.name;
            label.title = section.name;
            
            if (section.originallyCommented) {
                label.classList.add('originally-commented');
                label.title += ' (commented out in original)';
            }
            
            div.appendChild(checkbox);
            div.appendChild(label);
            itemsDiv.appendChild(div);
        });
        
        categoryDiv.appendChild(itemsDiv);
        container.appendChild(categoryDiv);
    });
    
    updateSectionCount();
}

function toggleCategory(category) {
    const categoryDiv = document.querySelector(`.section-category[data-category="${category}"]`);
    if (!categoryDiv) return;
    
    const items = categoryDiv.querySelectorAll('.section-item input[type="checkbox"]');
    const allChecked = Array.from(items).every(cb => cb.checked);
    items.forEach(cb => cb.checked = !allChecked);
    updateSectionCount();
}

function toggleAllSections(enabled) {
    const checkboxes = document.querySelectorAll('#sections-container input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = enabled);
    updateSectionCount();
}

function updateSectionCount() {
    const total = document.querySelectorAll('#sections-container input[type="checkbox"]').length;
    const checked = document.querySelectorAll('#sections-container input[type="checkbox"]:checked').length;
    const countEl = document.getElementById('sectionCount');
    if (countEl) {
        countEl.textContent = `${checked}/${total} sections enabled`;
    }
}

document.addEventListener('change', (e) => {
    if (e.target.matches('#sections-container input[type="checkbox"]')) {
        updateSectionCount();
    }
});

// ============================================
// CONFIG GENERATION
// ============================================

function generate() {
    const sections = window.currentConfigData.sections;
    const fileName = window.currentConfigData.fileName;
    const rawConfig = window.currentConfigData.raw;
    
    if (!sections || sections.length === 0) {
        alert('Please select a board or upload a config file first.');
        return;
    }
    
    const kinematicsKey = document.getElementById('kinematicsSelect').value;
    const kinematics = KINEMATICS[kinematicsKey];
    
    const settings = {
        kinematics: kinematicsKey,
        kinematicsKlipper: kinematics.klipperName,
        usesDelta: kinematics.usesDelta,
        bedX: parseInt(document.getElementById('bedX').value) || 235,
        bedY: parseInt(document.getElementById('bedY').value) || 235,
        bedZ: parseInt(document.getElementById('bedZ').value) || 250,
        deltaRadius: parseInt(document.getElementById('deltaRadius').value) || 140,
        deltaHeight: parseInt(document.getElementById('deltaHeight').value) || 300,
        deltaArmLength: parseInt(document.getElementById('deltaArmLength').value) || 270,
        zMotorCount: parseInt(document.getElementById('zMotorCount').value) || 1,
        zLevelingType: document.getElementById('zMotorCount').value === '4' 
            ? document.getElementById('quadLevelingType').value 
            : document.getElementById('zLevelingType')?.value || 'none',
        endstopX: document.getElementById('endstopX').value,
        endstopY: document.getElementById('endstopY').value,
        zEndstopType: document.getElementById('zEndstopType').value,
        probeOffsetX: parseInt(document.getElementById('probeOffsetX').value) || -40,
        probeOffsetY: parseInt(document.getElementById('probeOffsetY').value) || -10,
        sensorlessXY: document.getElementById('sensorlessXY').checked
    };
    
    const selectedIndices = Array.from(
        document.querySelectorAll('#sections-container input[type="checkbox"]:checked')
    ).map(cb => parseInt(cb.value));
    
    let lines = rawConfig.split('\n');
    
    const saveConfigStart = lines.findIndex(line => 
        line.includes('#*# <---------------------- SAVE_CONFIG ---------------------->')
    );
    
    let includesBlock = generateIncludesBlock();
    
    let output = '';
    let currentSectionIndex = -1;
    let inSaveConfig = false;
    let i = 0;
    
    if (includesBlock) {
        output += includesBlock + '\n';
    }
    
    while (i < lines.length) {
        const line = lines[i];
        
        if (saveConfigStart !== -1 && i >= saveConfigStart) {
            inSaveConfig = true;
        }
        
        if (inSaveConfig) {
            output += line + '\n';
            i++;
            continue;
        }
        
        const includeMatch = line.match(/^(\s*#\s*)?\[include\s+[^\]]+\]/i);
        if (includeMatch) {
            i++;
            continue;
        }
        
        const sectionMatch = line.match(/^(\s*#\s*)?\[([^\]]+)\]/);
        if (sectionMatch) {
            currentSectionIndex = sections.findIndex((s, idx) => 
                s.startLine === i
            );
        }
        
        const isCurrentSectionSelected = currentSectionIndex !== -1 && 
                                        selectedIndices.includes(currentSectionIndex);
        
        if (currentSectionIndex === -1) {
            output += line + '\n';
            i++;
        } else {
            const section = sections[currentSectionIndex];
            const wasCommented = section.originallyCommented;
            
            if (isCurrentSectionSelected) {
                let processedLine = line;
                
                if (wasCommented && line.trim().startsWith('#')) {
                    processedLine = line.replace(/^(\s*)#\s?/, '$1');
                }
                
                const result = applyLineModifications(processedLine, section.name, settings, 
                                                     window.currentConfigData.savedValues, lines, i);
                
                if (result.skipNext) {
                    output += result.line + '\n';
                    i += 2;
                } else {
                    output += result.line + '\n';
                    i++;
                }
            } else {
                let processedLine = line;
                
                if (!wasCommented && !line.trim().startsWith('#') && line.trim() !== '') {
                    processedLine = '#' + line;
                }
                
                output += processedLine + '\n';
                i++;
            }
        }
    }
    
    // Add additional Z motors if needed
    if (!settings.usesDelta && settings.zMotorCount > 1) {
        let additionalSections = generateAdditionalZMotors(settings, sections);
        
        if (saveConfigStart !== -1) {
            const beforeSaveConfig = output.substring(0, output.indexOf('#*# <---------------------- SAVE_CONFIG'));
            const saveConfigBlock = output.substring(output.indexOf('#*# <---------------------- SAVE_CONFIG'));
            output = beforeSaveConfig + '\n' + additionalSections + '\n' + saveConfigBlock;
        } else {
            output += '\n' + additionalSections;
        }
    }
    
    // Add secondary MCU blocks
    const secondaryMcuBlock = generateSecondaryMcuBlocks();
    if (secondaryMcuBlock) {
        if (saveConfigStart !== -1 && output.includes('#*# <---------------------- SAVE_CONFIG')) {
            const beforeSaveConfig = output.substring(0, output.indexOf('#*# <---------------------- SAVE_CONFIG'));
            const saveConfigSection = output.substring(output.indexOf('#*# <---------------------- SAVE_CONFIG'));
            output = beforeSaveConfig + secondaryMcuBlock + saveConfigSection;
        } else {
            output += secondaryMcuBlock;
        }
    }
    
    document.getElementById('output').value = output;
}

function applyLineModifications(line, sectionName, settings, savedValues, allLines, currentIndex) {
    const name = sectionName.toLowerCase();
    const trimmedLine = line.trim();
    
    if (savedValues) {
        const keyMatch = trimmedLine.match(/^\s*([a-z_]+)\s*[:=]/);
        if (keyMatch && !trimmedLine.startsWith('#')) {
            const key = `${name}.${keyMatch[1]}`;
            if (savedValues[key] !== undefined) {
                return {line: '#' + line + '  # (overridden in SAVE_CONFIG)', skipNext: false};
            }
        }
    }
    
    let modified = line;
    let skipNext = false;
    
    if (name === 'printer' && trimmedLine.startsWith('kinematics:')) {
        modified = line.replace(/kinematics:\s*\w+/, `kinematics: ${settings.kinematicsKlipper}`);
    }
    
    if (name === 'stepper_x' || name === 'stepper_y') {
        const isStepper = name === 'stepper_x' || name === 'stepper_y';
        
        if (settings.sensorlessXY && isStepper) {
            if (trimmedLine.match(/^endstop_pin:/) && !trimmedLine.includes('virtual_endstop')) {
                modified = `#${line}  # Physical endstop (disabled for sensorless)\nendstop_pin: tmc2209_${name}:virtual_endstop`;
            }
            
            if (trimmedLine.match(/^homing_retract_dist:/)) {
                modified = line.replace(/homing_retract_dist:\s*[\d.]+/, 'homing_retract_dist: 0');
            }
            
        } else if (!settings.sensorlessXY && isStepper) {
            if (trimmedLine.match(/^#\s*endstop_pin:/) && 
                !trimmedLine.includes('virtual_endstop') && 
                !trimmedLine.includes('probe:')) {
                modified = line.replace(/^(\s*)#\s*/, '$1');
            }
            
            if (trimmedLine.match(/^endstop_pin:.*virtual_endstop/)) {
                if (currentIndex > 0) {
                    const prevLine = allLines[currentIndex - 1];
                    if (prevLine.trim().match(/^endstop_pin:/) && 
                        !prevLine.includes('virtual_endstop') &&
                        !prevLine.includes('#')) {
                        skipNext = true;
                        modified = '';
                    } else {
                        modified = `#${line}  # Sensorless disabled - configure physical endstop_pin`;
                    }
                } else {
                    modified = `#${line}  # Sensorless disabled - configure physical endstop_pin`;
                }
            }
            
            if (trimmedLine.match(/^homing_retract_dist:\s*0/)) {
                modified = line.replace(/homing_retract_dist:\s*0/, 'homing_retract_dist: 5');
            }
        }
    }
    
    if (name.startsWith('tmc2209 stepper_x') || name.startsWith('tmc2209 stepper_y')) {
        if (settings.sensorlessXY) {
            if (trimmedLine.match(/^#.*diag_pin:/)) {
                modified = line.replace(/^(\s*)#\s*/, '$1');
            }
            if (trimmedLine.match(/^#.*driver_SGTHRS:/)) {
                modified = line.replace(/^(\s*)#\s*/, '$1');
            }
        } else {
            if (trimmedLine.match(/^diag_pin:/) && !trimmedLine.startsWith('#')) {
                modified = '#' + line + '  # (sensorless homing disabled)';
            }
            if (trimmedLine.match(/^driver_SGTHRS:/) && !trimmedLine.startsWith('#')) {
                modified = '#' + line + '  # (sensorless homing disabled)';
            }
        }
    }
    
    if (!settings.usesDelta) {
        if (name === 'stepper_x' && trimmedLine.match(/^position_max:/)) {
            modified = line.replace(/position_max:\s*[\d.]+/, `position_max: ${settings.bedX}`);
        }
        if (name === 'stepper_x' && trimmedLine.match(/^position_endstop:/)) {
            if (settings.endstopX === 'max') {
                modified = line.replace(/position_endstop:\s*[\d.]+/, `position_endstop: ${settings.bedX}`);
            } else {
                modified = line.replace(/position_endstop:\s*[\d.]+/, `position_endstop: 0`);
            }
        }
        
        if (name === 'stepper_y' && trimmedLine.match(/^position_max:/)) {
            modified = line.replace(/position_max:\s*[\d.]+/, `position_max: ${settings.bedY}`);
        }
        if (name === 'stepper_y' && trimmedLine.match(/^position_endstop:/)) {
            if (settings.endstopY === 'max') {
                modified = line.replace(/position_endstop:\s*[\d.]+/, `position_endstop: ${settings.bedY}`);
            } else {
                modified = line.replace(/position_endstop:\s*[\d.]+/, `position_endstop: 0`);
            }
        }
        
        if (name === 'stepper_z' && trimmedLine.match(/^position_max:/)) {
            modified = line.replace(/position_max:\s*[\d.]+/, `position_max: ${settings.bedZ}`);
        }
    }
    
    if (settings.usesDelta) {
        if ((name === 'stepper_a' || name === 'stepper_b' || name === 'stepper_c') && trimmedLine.match(/^position_max:/)) {
            modified = line.replace(/position_max:\s*[\d.]+/, `position_max: ${settings.deltaHeight}`);
        }
        if ((name === 'stepper_a' || name === 'stepper_b' || name === 'stepper_c') && trimmedLine.match(/^position_endstop:/)) {
            modified = line.replace(/position_endstop:\s*[\d.]+/, `position_endstop: ${settings.deltaHeight}`);
        }
    }
    
    if ((name === 'probe' || name === 'bltouch') && trimmedLine.match(/^x_offset:/)) {
        modified = line.replace(/x_offset:\s*[-\d.]+/, `x_offset: ${settings.probeOffsetX}`);
    }
    if ((name === 'probe' || name === 'bltouch') && trimmedLine.match(/^y_offset:/)) {
        modified = line.replace(/y_offset:\s*[-\d.]+/, `y_offset: ${settings.probeOffsetY}`);
    }
    
    return {line: modified, skipNext: skipNext};
}

function generateAdditionalZMotors(settings, sections) {
    if (settings.zMotorCount <= 1) return '';
    
    const separator = '#=====================================#\n';
    let cfg = '';
    
    cfg += `${separator}`;
    cfg += `# ADDITIONAL Z MOTORS (Generated)\n`;
    cfg += `${separator}\n\n`;
    
    const stepperZ = sections.find(s => s.name.toLowerCase() === 'stepper_z');
    const stepperZContent = stepperZ ? stepperZ.content : '';
    
    const rotDistMatch = stepperZContent.match(/rotation_distance:\s*([\d.]+)/);
    const rotationDistance = rotDistMatch ? rotDistMatch[1] : '8';
    
    const microMatch = stepperZContent.match(/microsteps:\s*(\d+)/);
    const microsteps = microMatch ? microMatch[1] : '16';
    
    for (let i = 1; i < settings.zMotorCount; i++) {
        cfg += `[stepper_z${i}]\n`;
        cfg += `step_pin: CHANGE_ME\n`;
        cfg += `dir_pin: CHANGE_ME\n`;
        cfg += `enable_pin: !CHANGE_ME\n`;
        cfg += `microsteps: ${microsteps}\n`;
        cfg += `rotation_distance: ${rotationDistance}\n\n`;
    }
    
    const tmcZ = sections.find(s => {
        const name = s.name.toLowerCase();
        return name.includes('tmc') && name.includes('stepper_z') && !name.includes('stepper_z1');
    });
    
    if (tmcZ) {
        const tmcType = tmcZ.name.split(' ')[0];
        const tmcContent = tmcZ.content;
        
        const currentMatch = tmcContent.match(/run_current:\s*([\d.]+)/);
        const runCurrent = currentMatch ? currentMatch[1] : '0.580';
        
        for (let i = 1; i < settings.zMotorCount; i++) {
            cfg += `[${tmcType} stepper_z${i}]\n`;
            cfg += `uart_pin: CHANGE_ME\n`;
            cfg += `run_current: ${runCurrent}\n`;
            cfg += `stealthchop_threshold: 999999\n\n`;
        }
    }
    
    if (settings.zLevelingType === 'z_tilt') {
        cfg += `[z_tilt]\n`;
        cfg += `z_positions:\n`;
        if (settings.zMotorCount === 2) {
            cfg += `    -50, ${Math.round(settings.bedY / 2)}\n`;
            cfg += `    ${settings.bedX + 50}, ${Math.round(settings.bedY / 2)}\n`;
        } else if (settings.zMotorCount === 3) {
            cfg += `    ${Math.round(settings.bedX / 2)}, -50\n`;
            cfg += `    -50, ${settings.bedY + 50}\n`;
            cfg += `    ${settings.bedX + 50}, ${settings.bedY + 50}\n`;
        }
        cfg += `points:\n`;
        cfg += `    30, ${Math.round(settings.bedY / 2)}\n`;
        cfg += `    ${settings.bedX - 30}, ${Math.round(settings.bedY / 2)}\n`;
        cfg += `speed: 150\n`;
        cfg += `horizontal_move_z: 5\n`;
        cfg += `retries: 5\n`;
        cfg += `retry_tolerance: 0.0075\n\n`;
    } else if (settings.zLevelingType === 'quad_gantry_level') {
        cfg += `[quad_gantry_level]\n`;
        cfg += `gantry_corners:\n`;
        cfg += `    -60, -10\n`;
        cfg += `    ${settings.bedX + 60}, ${settings.bedY + 60}\n`;
        cfg += `points:\n`;
        cfg += `    30, 30\n`;
        cfg += `    30, ${settings.bedY - 30}\n`;
        cfg += `    ${settings.bedX - 30}, ${settings.bedY - 30}\n`;
        cfg += `    ${settings.bedX - 30}, 30\n`;
        cfg += `speed: 150\n`;
        cfg += `horizontal_move_z: 5\n`;
        cfg += `retries: 5\n`;
        cfg += `retry_tolerance: 0.0075\n`;
        cfg += `max_adjust: 10\n\n`;
    }
    
    return cfg;
}

// ============================================
// DOWNLOAD FUNCTION
// ============================================

function download() {
    const output = document.getElementById('output').value;
    if (!output) {
        alert('Please generate a config first.');
        return;
    }
    
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'printer.cfg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
