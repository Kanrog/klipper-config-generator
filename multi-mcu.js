// ============================================
// MULTI-MCU SUPPORT - PHASE 1
// ============================================
// This module adds support for secondary MCUs (expansion boards, toolheads, etc.)

// Secondary MCU presets for common boards
const SECONDARY_MCU_PRESETS = {
    // CAN Toolhead Boards
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
        description: 'Mellow FLY-SHT36/42 CAN toolhead',
        configFile: 'sample-mellow-fly-sht36.cfg'
    },
    'duet-1lc': {
        name: 'Duet3 1LC',
        mcuName: 'duet',
        type: 'toolhead',
        connectionType: 'canbus',
        description: 'Duet3 1LC Toolboard',
        configFile: 'sample-duet3-1lc.cfg'
    },
    // Host MCU
    'rpi': {
        name: 'Raspberry Pi',
        mcuName: 'host',
        type: 'host',
        connectionType: 'linux',
        description: 'Raspberry Pi as secondary MCU for GPIO/sensors',
        configFile: 'sample-raspberry-pi.cfg'
    },
    // Expansion / Motor boards
    'expansion': {
        name: 'Generic Expansion Board',
        mcuName: 'extra_mcu',
        type: 'expansion',
        connectionType: 'usb',
        description: 'Additional MCU for more stepper drivers'
    }
};

// ============================================
// STATE MANAGEMENT
// ============================================

// Initialize state if not exists
if (!window.currentConfigData) {
    window.currentConfigData = { secondaryMcus: [] };
} else if (!window.currentConfigData.secondaryMcus) {
    window.currentConfigData.secondaryMcus = [];
}

/**
 * Initialize the secondary MCUs from storage or defaults
 */
function initSecondaryMcus() {
    // If we have saved state, load it
    const saved = localStorage.getItem('kcg_secondary_mcus');
    if (saved) {
        try {
            window.currentConfigData.secondaryMcus = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load saved MCUs', e);
        }
    }
}

/**
 * Add a secondary MCU from a preset ID
 */
function addSecondaryMcuFromPreset(presetId) {
    const preset = SECONDARY_MCU_PRESETS[presetId];
    if (!preset) return;
    
    const newMcu = {
        id: 'mcu_' + Date.now(),
        name: preset.name,
        mcuName: preset.mcuName,
        type: preset.type,
        connectionType: preset.connectionType,
        uuid: '',
        serial: '',
        enabled: true,
        presetId: presetId,
        configFile: preset.configFile
    };
    
    window.currentConfigData.secondaryMcus.push(newMcu);
    saveAndRender();
}

/**
 * Add a secondary MCU from an uploaded config file
 */
function handleSecondaryMcuUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        
        const newMcu = {
            id: 'mcu_' + Date.now(),
            name: file.name.replace('.cfg', ''),
            mcuName: 'extra_mcu',
            type: 'custom',
            connectionType: 'usb',
            uuid: '',
            serial: '',
            enabled: true,
            content: content
        };
        
        window.currentConfigData.secondaryMcus.push(newMcu);
        saveAndRender();
        event.target.value = ''; // Reset file input
    };
    reader.readAsText(file);
}

/**
 * Remove a secondary MCU
 */
function removeSecondaryMcu(id) {
    window.currentConfigData.secondaryMcus = window.currentConfigData.secondaryMcus.filter(m => m.id !== id);
    saveAndRender();
}

/**
 * Toggle enabled state
 */
function toggleSecondaryMcu(id) {
    const mcu = window.currentConfigData.secondaryMcus.find(m => m.id === id);
    if (mcu) {
        mcu.enabled = !mcu.enabled;
        saveAndRender();
    }
}

/**
 * Update an MCU field
 */
function updateSecondaryMcu(id, field, value) {
    const mcu = window.currentConfigData.secondaryMcus.find(m => m.id === id);
    if (mcu) {
        mcu[field] = value;
        saveSecondaryMcus(); // Just save, don't re-render entire list to keep focus
    }
}

/**
 * Save state to local storage
 */
function saveSecondaryMcus() {
    localStorage.setItem('kcg_secondary_mcus', JSON.stringify(window.currentConfigData.secondaryMcus));
    updateMcuCount();
}

function saveAndRender() {
    saveSecondaryMcus();
    renderSecondaryMcusUI();
}

function updateMcuCount() {
    const count = window.currentConfigData.secondaryMcus.length;
    const badge = document.getElementById('secondaryMcuCount');
    if (badge) badge.textContent = count;
}

// ============================================
// UI RENDERING
// ============================================

/**
 * Render the list of secondary MCUs
 */
function renderSecondaryMcusUI() {
    const container = document.getElementById('secondary-mcu-list');
    if (!container) return;
    
    const mcus = window.currentConfigData.secondaryMcus || [];
    
    if (mcus.length === 0) {
        container.innerHTML = '<div class="mcu-empty">No secondary MCUs added. Use the options below to add toolhead boards, expansion boards, or host MCU.</div>';
        return;
    }
    
    let html = '';
    mcus.forEach(mcu => {
        const connectionBadge = mcu.connectionType === 'canbus' 
            ? '<span class="mcu-badge canbus">CAN</span>' 
            : '<span class="mcu-badge usb">USB</span>';
            
        html += `
        <div class="mcu-item ${mcu.enabled ? '' : 'disabled'}" id="${mcu.id}">
            <div class="mcu-item-header" onclick="this.parentElement.classList.toggle('expanded')">
                <div class="mcu-item-title">
                    <input type="checkbox" ${mcu.enabled ? 'checked' : ''} onclick="event.stopPropagation(); toggleSecondaryMcu('${mcu.id}')">
                    <span>${mcu.name}</span>
                    <span class="mcu-badge">${mcu.mcuName}</span>
                    ${connectionBadge}
                </div>
                <div class="mcu-actions">
                    <button class="btn-icon delete" onclick="event.stopPropagation(); removeSecondaryMcu('${mcu.id}')">🗑️</button>
                </div>
            </div>
            <div class="mcu-item-body">
                <div class="mcu-form-row">
                    <label class="mcu-form-label">MCU Name (used in pin prefixes)</label>
                    <input type="text" class="mcu-form-input" value="${mcu.mcuName}" onchange="updateSecondaryMcu('${mcu.id}', 'mcuName', this.value)">
                </div>
                ${mcu.connectionType === 'canbus' ? `
                <div class="mcu-form-row">
                    <label class="mcu-form-label">CAN Bus UUID</label>
                    <input type="text" class="mcu-form-input" placeholder="e.g., 1234567890ab" value="${mcu.uuid}" onchange="updateSecondaryMcu('${mcu.id}', 'uuid', this.value)">
                </div>
                ` : `
                <div class="mcu-form-row">
                    <label class="mcu-form-label">Serial Port</label>
                    <input type="text" class="mcu-form-input" placeholder="/dev/serial/by-id/..." value="${mcu.serial}" onchange="updateSecondaryMcu('${mcu.id}', 'serial', this.value)">
                </div>
                `}
                <div class="mcu-info-text">
                    ${mcu.description || 'Custom configuration'}
                </div>
            </div>
        </div>
        `;
    });
    
    container.innerHTML = html;
    updateMcuCount();
}

// ============================================
// CONFIG GENERATION
// ============================================

/**
 * Generate the configuration blocks for all enabled secondary MCUs
 */
function generateSecondaryMcuBlocks() {
    const mcus = window.currentConfigData.secondaryMcus || [];
    const enabledMcus = mcus.filter(m => m.enabled);
    
    if (enabledMcus.length === 0) return '';
    
    let cfg = '\n#=====================================#\n';
    cfg += '#       SECONDARY MCU CONFIGS         #\n';
    cfg += '#=====================================#\n\n';
    
    enabledMcus.forEach(mcu => {
        cfg += `[mcu ${mcu.mcuName}]\n`;
        
        if (mcu.connectionType === 'canbus') {
            cfg += `canbus_uuid: ${mcu.uuid || 'PASTE_YOUR_UUID_HERE'}\n`;
        } else if (mcu.connectionType === 'linux') {
            cfg += `serial: /tmp/klipper_host_mcu\n`;
        } else {
            cfg += `serial: ${mcu.serial || '/dev/serial/by-id/usb-Klipper_CHANGE_ME'}\n`;
        }
        
        cfg += `\n# Config based on: ${mcu.configFile || 'Custom Upload'}\n`;
        cfg += `# ${mcu.description || mcu.name}\n`;
        cfg += `# Remember to prefix all pins with "${mcu.mcuName}:" when using this MCU\n`;
        cfg += `# Example: step_pin: ${mcu.mcuName}:PB13\n\n`;
        
        // Add pin reference if available (placeholder logic)
        if (mcu.content) {
            cfg += `#-------------------------------------#\n`;
            cfg += `# Uploaded Config Content\n`;
            cfg += `#-------------------------------------#\n`;
            // Comment out the uploaded content to avoid conflicts
            const commented = mcu.content.split('\n').map(l => '# ' + l).join('\n');
            cfg += commented + '\n\n';
        }
    });
    
    return cfg;
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the secondary MCU UI on page load
 */
function initSecondaryMcuUI() {
    initSecondaryMcus();
    renderSecondaryMcusUI();
}

/**
 * Handle preset selection from dropdown
 * (Added to fix integration issue)
 */
function handleSecondaryMcuPresetSelect(select) {
    const value = select.value;
    if (value) {
        if (value === 'expansion') {
            // Expansion boards use the existing board list if available
            if (typeof openExpansionBoardModal === 'function') {
                openExpansionBoardModal();
            } else {
                addSecondaryMcuFromPreset('expansion');
            }
        } else {
            addSecondaryMcuFromPreset(value);
        }
        select.value = ''; // Reset dropdown
    }
}