// Fairline Klipper Config Generator
// Copyright (C) 2026  Kanrog

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see https://www.gnu.org/licenses/gpl-3.0.txt.

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

// MCU Function definitions - what each MCU type can control
const MCU_FUNCTIONS = {
    // Stepper-related functions
    steppers: {
        label: 'Stepper Motors',
        icon: '⚙️',
        description: 'Control stepper motors from this MCU',
        subOptions: {
            stepper_x: { label: 'X Stepper', forTypes: ['expansion'] },
            stepper_y: { label: 'Y Stepper', forTypes: ['expansion'] },
            stepper_z: { label: 'Z Stepper', forTypes: ['expansion'] },
            stepper_z1: { label: 'Z1 Stepper', forTypes: ['expansion'] },
            stepper_z2: { label: 'Z2 Stepper', forTypes: ['expansion'] },
            stepper_z3: { label: 'Z3 Stepper', forTypes: ['expansion'] },
            extruder: { label: 'Extruder', forTypes: ['toolhead', 'expansion'] },
            extruder1: { label: 'Extruder 2', forTypes: ['expansion'] }
        },
        forTypes: ['toolhead', 'expansion']
    },
    // Heater functions
    heaters: {
        label: 'Heaters',
        icon: '🔥',
        description: 'Control heaters from this MCU',
        subOptions: {
            hotend: { label: 'Hotend Heater', forTypes: ['toolhead', 'expansion'] },
            heater_bed: { label: 'Heated Bed', forTypes: ['expansion'] },
            heater_chamber: { label: 'Chamber Heater', forTypes: ['expansion'] }
        },
        forTypes: ['toolhead', 'expansion']
    },
    // Fan functions
    fans: {
        label: 'Fans',
        icon: '💨',
        description: 'Control fans from this MCU',
        subOptions: {
            part_fan: { label: 'Part Cooling Fan', forTypes: ['toolhead', 'expansion'] },
            hotend_fan: { label: 'Hotend Fan', forTypes: ['toolhead', 'expansion'] },
            controller_fan: { label: 'Controller Fan', forTypes: ['expansion'] },
            exhaust_fan: { label: 'Exhaust Fan', forTypes: ['expansion'] },
            filter_fan: { label: 'Nevermore/Filter Fan', forTypes: ['expansion'] }
        },
        forTypes: ['toolhead', 'expansion', 'host']
    },
    // Temperature sensors
    sensors: {
        label: 'Temperature Sensors',
        icon: '🌡️',
        description: 'Read temperature sensors',
        subOptions: {
            hotend_temp: { label: 'Hotend Thermistor', forTypes: ['toolhead', 'expansion'] },
            bed_temp: { label: 'Bed Thermistor', forTypes: ['expansion'] },
            chamber_temp: { label: 'Chamber Sensor', forTypes: ['expansion', 'host'] },
            mcu_temp: { label: 'MCU Temperature', forTypes: ['toolhead', 'expansion', 'host'] }
        },
        forTypes: ['toolhead', 'expansion', 'host']
    },
    // Probing
    probing: {
        label: 'Probing',
        icon: '📍',
        description: 'Probe or endstop connections',
        subOptions: {
            probe: { label: 'Z Probe (Inductive/Capacitive)', forTypes: ['toolhead', 'expansion'] },
            bltouch: { label: 'BLTouch', forTypes: ['toolhead', 'expansion'] },
            tap: { label: 'Voron Tap', forTypes: ['toolhead'] },
            endstops: { label: 'Endstop Switches', forTypes: ['expansion'] }
        },
        forTypes: ['toolhead', 'expansion']
    },
    // LEDs
    leds: {
        label: 'LEDs',
        icon: '💡',
        description: 'Control LED lighting',
        subOptions: {
            toolhead_leds: { label: 'Toolhead LEDs (Stealthburner)', forTypes: ['toolhead'] },
            case_leds: { label: 'Case/Chamber LEDs', forTypes: ['expansion', 'host'] },
            status_led: { label: 'Status LED', forTypes: ['toolhead', 'expansion', 'host'] }
        },
        forTypes: ['toolhead', 'expansion', 'host']
    },
    // Accelerometer
    accelerometer: {
        label: 'Accelerometer',
        icon: '📊',
        description: 'Input shaper accelerometer',
        subOptions: {
            adxl345: { label: 'ADXL345', forTypes: ['toolhead', 'host'] },
            lis2dw: { label: 'LIS2DW', forTypes: ['toolhead'] }
        },
        forTypes: ['toolhead', 'host']
    },
    // Filament sensor
    filament: {
        label: 'Filament Sensor',
        icon: '🧵',
        description: 'Filament runout detection',
        subOptions: {
            filament_switch: { label: 'Switch Sensor', forTypes: ['toolhead', 'expansion', 'host'] },
            filament_motion: { label: 'Motion Sensor (Encoder)', forTypes: ['toolhead', 'expansion'] }
        },
        forTypes: ['toolhead', 'expansion', 'host']
    },
    // GPIO (mainly for RPi)
    gpio: {
        label: 'GPIO Pins',
        icon: '🔌',
        description: 'General purpose I/O',
        subOptions: {
            relay: { label: 'Relay Control', forTypes: ['host', 'expansion'] },
            button: { label: 'Physical Buttons', forTypes: ['host', 'expansion'] },
            power_control: { label: 'Power Control', forTypes: ['host', 'expansion'] }
        },
        forTypes: ['host', 'expansion']
    }
};

// Secondary MCU presets with default functions
const SECONDARY_MCU_PRESETS = {
    'ebb36-v1.2': {
        name: 'BTT EBB36 v1.2',
        mcuName: 'EBBCan',
        type: 'toolhead',
        connectionType: 'canbus',
        description: 'BigTreeTech EBB36 CAN toolhead board',
        configFile: 'sample-bigtreetech-ebb-canbus-v1.2.cfg',
        defaultFunctions: {
            steppers: ['extruder'],
            heaters: ['hotend'],
            fans: ['part_fan', 'hotend_fan'],
            sensors: ['hotend_temp'],
            probing: ['probe'],
            accelerometer: ['adxl345']
        }
    },
    'ebb42-v1.2': {
        name: 'BTT EBB42 v1.2',
        mcuName: 'EBBCan',
        type: 'toolhead',
        connectionType: 'canbus',
        description: 'BigTreeTech EBB42 CAN toolhead board',
        configFile: 'sample-bigtreetech-ebb-canbus-v1.2.cfg',
        defaultFunctions: {
            steppers: ['extruder'],
            heaters: ['hotend'],
            fans: ['part_fan', 'hotend_fan'],
            sensors: ['hotend_temp'],
            probing: ['probe'],
            accelerometer: ['adxl345']
        }
    },
    'ebb36-v1.1': {
        name: 'BTT EBB36 v1.1',
        mcuName: 'EBBCan',
        type: 'toolhead',
        connectionType: 'canbus',
        description: 'BigTreeTech EBB36 v1.1 CAN toolhead',
        configFile: 'sample-bigtreetech-ebb-canbus-v1.1.cfg',
        defaultFunctions: {
            steppers: ['extruder'],
            heaters: ['hotend'],
            fans: ['part_fan', 'hotend_fan'],
            sensors: ['hotend_temp'],
            probing: ['probe']
        }
    },
    'ebb36-v1.0': {
        name: 'BTT EBB36 v1.0',
        mcuName: 'EBBCan',
        type: 'toolhead',
        connectionType: 'canbus',
        description: 'BigTreeTech EBB36 v1.0 CAN toolhead',
        configFile: 'sample-bigtreetech-ebb-canbus-v1.0.cfg',
        defaultFunctions: {
            steppers: ['extruder'],
            heaters: ['hotend'],
            fans: ['part_fan', 'hotend_fan'],
            sensors: ['hotend_temp']
        }
    },
    'sht36': {
        name: 'Mellow SHT36/42',
        mcuName: 'sht',
        type: 'toolhead',
        connectionType: 'canbus',
        description: 'Mellow FLY-SHT36/42 CAN toolhead',
        defaultFunctions: {
            steppers: ['extruder'],
            heaters: ['hotend'],
            fans: ['part_fan', 'hotend_fan'],
            sensors: ['hotend_temp'],
            probing: ['probe'],
            accelerometer: ['adxl345']
        }
    },
    'rpi': {
        name: 'Raspberry Pi',
        mcuName: 'host',
        type: 'host',
        connectionType: 'linux',
        description: 'Raspberry Pi as secondary MCU for GPIO/sensors',
        configFile: 'sample-raspberry-pi.cfg',
        defaultFunctions: {
            accelerometer: ['adxl345'],
            sensors: ['chamber_temp'],
            gpio: ['power_control']
        }
    },
    'expansion': {
        name: 'Expansion Board',
        mcuName: 'mcu2',
        type: 'expansion',
        connectionType: 'usb',
        description: 'Additional printer board for more motors',
        defaultFunctions: {
            steppers: ['stepper_z1', 'stepper_z2'],
            fans: ['controller_fan']
        }
    },
    'mmu': {
        name: 'MMU/ERCF Board',
        mcuName: 'mmboard',
        type: 'mmu',
        connectionType: 'usb',
        description: 'Multi-material unit control board',
        configFile: 'sample-mmu2s-diy.cfg',
        defaultFunctions: {
            steppers: ['extruder1'],
            filament: ['filament_motion']
        }
    },
    'duet-1lc': {
        name: 'Duet3 1LC',
        mcuName: 'toolboard',
        type: 'toolhead',
        connectionType: 'canbus',
        description: 'Duet3 1LC CAN toolboard',
        configFile: 'sample-duet3-1lc.cfg',
        defaultFunctions: {
            steppers: ['extruder'],
            heaters: ['hotend'],
            fans: ['part_fan', 'hotend_fan'],
            sensors: ['hotend_temp']
        }
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
        isCustomUpload: false,
        functions: JSON.parse(JSON.stringify(preset.defaultFunctions || {}))  // Deep copy default functions
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
        
        // Try to detect MCU type from config content
        let mcuType = 'custom';
        if (configText.includes('extruder') && (configText.includes('heater_fan') || configText.includes('fan_generic'))) {
            mcuType = 'toolhead';
        } else if (configText.includes('/tmp/klipper_host_mcu')) {
            mcuType = 'host';
        } else if (configText.includes('stepper_')) {
            mcuType = 'expansion';
        }
        
        const mcu = {
            id: id,
            presetKey: null,
            name: detectedName,
            displayName: `📁 ${file.name}`,
            type: mcuType,
            connectionType: connectionType,
            description: `Uploaded config: ${file.name}`,
            serial: connectionType === 'canbus' ? '' : '/dev/serial/by-id/usb-Klipper_CHANGE_ME',
            canbus_uuid: connectionType === 'canbus' ? '' : null,
            configFile: file.name,
            configData: configText,
            enabled: true,
            isCustomUpload: true,
            functions: {},  // Empty functions - user will configure
            parsedSections: parseSecondaryMcuSections(configText)  // Parse immediately
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
        
        // Parse the config to extract sections and pin mappings
        mcu.parsedSections = parseSecondaryMcuSections(configText);
        
        renderSecondaryMcusUI();
    } catch (error) {
        console.error('Error loading secondary MCU config:', error);
    }
}

/**
 * Parse a secondary MCU's config file into sections with their content
 */
function parseSecondaryMcuSections(configText) {
    if (!configText) return {};
    
    const sections = {};
    const lines = configText.split('\n');
    let currentSection = null;
    let currentContent = [];
    
    for (const line of lines) {
        // Check for section header (including commented ones)
        const sectionMatch = line.match(/^#*\s*\[([^\]]+)\]/);
        
        if (sectionMatch) {
            // Save previous section
            if (currentSection) {
                sections[currentSection.toLowerCase()] = {
                    name: currentSection,
                    content: currentContent.join('\n'),
                    pins: extractPinsFromContent(currentContent.join('\n'))
                };
            }
            
            currentSection = sectionMatch[1].trim();
            currentContent = [line];
        } else if (currentSection) {
            currentContent.push(line);
        }
    }
    
    // Save last section
    if (currentSection) {
        sections[currentSection.toLowerCase()] = {
            name: currentSection,
            content: currentContent.join('\n'),
            pins: extractPinsFromContent(currentContent.join('\n'))
        };
    }
    
    return sections;
}

/**
 * Extract pin definitions from a section's content
 */
function extractPinsFromContent(content) {
    const pins = {};
    const pinPatterns = [
        /^#*\s*(step_pin):\s*([^\s#]+)/gm,
        /^#*\s*(dir_pin):\s*([^\s#]+)/gm,
        /^#*\s*(enable_pin):\s*([^\s#]+)/gm,
        /^#*\s*(uart_pin):\s*([^\s#]+)/gm,
        /^#*\s*(cs_pin):\s*([^\s#]+)/gm,
        /^#*\s*(heater_pin):\s*([^\s#]+)/gm,
        /^#*\s*(sensor_pin):\s*([^\s#]+)/gm,
        /^#*\s*(pin):\s*([^\s#]+)/gm,
        /^#*\s*(sensor_pin):\s*([^\s#]+)/gm,
        /^#*\s*(control_pin):\s*([^\s#]+)/gm,
        /^#*\s*(diag_pin):\s*([^\s#]+)/gm,
        /^#*\s*(endstop_pin):\s*([^\s#]+)/gm,
        /^#*\s*(spi_software_sclk_pin):\s*([^\s#]+)/gm,
        /^#*\s*(spi_software_mosi_pin):\s*([^\s#]+)/gm,
        /^#*\s*(spi_software_miso_pin):\s*([^\s#]+)/gm,
    ];
    
    for (const pattern of pinPatterns) {
        let match;
        // Reset pattern lastIndex
        pattern.lastIndex = 0;
        while ((match = pattern.exec(content)) !== null) {
            const pinName = match[1];
            let pinValue = match[2];
            // Remove any existing MCU prefix for generic configs
            if (pinValue.includes(':')) {
                pinValue = pinValue.split(':')[1];
            }
            pins[pinName] = pinValue;
        }
    }
    
    return pins;
}

/**
 * Get pins for a specific stepper driver slot from the secondary MCU's board config
 * Maps generic stepper slots (E0, E1, X, Y, Z, etc.) to the requested function
 */
function getSecondaryMcuStepperPins(mcu, requestedStepper, slotIndex) {
    if (!mcu.parsedSections) {
        // Try to parse if not already done
        if (mcu.configData) {
            mcu.parsedSections = parseSecondaryMcuSections(mcu.configData);
        } else {
            return null;
        }
    }
    
    const sections = mcu.parsedSections;
    
    // Priority order for finding stepper pins based on what's typically available
    // For expansion boards used for Z motors, we often use the extruder slots or dedicated stepper slots
    const stepperSlotPriority = [
        // Try to match exact name first
        `stepper_${requestedStepper.replace('stepper_', '')}`,
        // For additional Z steppers, look at extruder slots which are often repurposed
        'extruder',
        'extruder1', 
        'stepper_z',
        'stepper_z1',
        'stepper_z2',
        'stepper_z3',
        'stepper_x',
        'stepper_y',
        'stepper_e',
        'stepper_e0',
        'stepper_e1',
    ];
    
    // Track which slots we've already used
    if (!mcu._usedSlots) {
        mcu._usedSlots = new Set();
    }
    
    // Find an available slot
    for (const slotName of stepperSlotPriority) {
        const sectionKey = slotName.toLowerCase();
        if (sections[sectionKey] && !mcu._usedSlots.has(sectionKey)) {
            const section = sections[sectionKey];
            if (section.pins && section.pins.step_pin) {
                mcu._usedSlots.add(sectionKey);
                
                // Also look for the matching TMC section
                let tmcPins = null;
                for (const key of Object.keys(sections)) {
                    if (key.startsWith('tmc') && key.includes(slotName.replace('stepper_', ''))) {
                        tmcPins = sections[key].pins;
                        break;
                    }
                }
                
                return {
                    stepperPins: section.pins,
                    tmcPins: tmcPins,
                    sourceSlot: slotName
                };
            }
        }
    }
    
    return null;
}

/**
 * Get pins for a specific function from the secondary MCU's board config
 */
function getSecondaryMcuPins(mcu, sectionName) {
    if (!mcu.parsedSections) {
        if (mcu.configData) {
            mcu.parsedSections = parseSecondaryMcuSections(mcu.configData);
        } else {
            return null;
        }
    }
    
    const sections = mcu.parsedSections;
    const key = sectionName.toLowerCase();
    
    if (sections[key]) {
        return sections[key].pins;
    }
    
    return null;
}

/**
 * Reset used slots tracking (call before generating config)
 */
function resetSecondaryMcuSlotTracking() {
    const mcus = window.currentConfigData.secondaryMcus || [];
    for (const mcu of mcus) {
        mcu._usedSlots = new Set();
    }
}

/**
 * Get a list of section names that are being handled by secondary MCUs
 * These sections should be commented out in the main config
 */
function getSectionsHandledBySecondaryMcus() {
    const handledSections = new Set();
    const mcus = window.currentConfigData.secondaryMcus || [];
    
    for (const mcu of mcus) {
        if (!mcu.enabled || !mcu.functions) continue;
        
        // Steppers
        if (mcu.functions.steppers) {
            for (const stepper of mcu.functions.steppers) {
                // Add the stepper section
                handledSections.add(stepper);
                // Also add corresponding TMC sections
                handledSections.add(`tmc2209 ${stepper}`);
                handledSections.add(`tmc2208 ${stepper}`);
                handledSections.add(`tmc2130 ${stepper}`);
                handledSections.add(`tmc5160 ${stepper}`);
            }
        }
        
        // Heaters
        if (mcu.functions.heaters) {
            for (const heater of mcu.functions.heaters) {
                if (heater === 'hotend') {
                    handledSections.add('extruder');
                    // Also add TMC for extruder
                    handledSections.add('tmc2209 extruder');
                    handledSections.add('tmc2208 extruder');
                } else if (heater === 'heater_bed') {
                    handledSections.add('heater_bed');
                }
            }
        }
        
        // Fans
        if (mcu.functions.fans) {
            for (const fan of mcu.functions.fans) {
                if (fan === 'part_fan') {
                    handledSections.add('fan');
                } else if (fan === 'hotend_fan') {
                    handledSections.add('heater_fan hotend_fan');
                    handledSections.add('heater_fan my_nozzle_fan');
                    handledSections.add('heater_fan extruder_fan');
                }
            }
        }
        
        // Probing
        if (mcu.functions.probing) {
            for (const probe of mcu.functions.probing) {
                if (probe === 'probe' || probe === 'tap') {
                    handledSections.add('probe');
                } else if (probe === 'bltouch') {
                    handledSections.add('bltouch');
                }
            }
        }
        
        // Accelerometer
        if (mcu.functions.accelerometer) {
            for (const accel of mcu.functions.accelerometer) {
                handledSections.add(accel); // adxl345, lis2dw
            }
        }
        
        // Filament sensors
        if (mcu.functions.filament) {
            for (const sensor of mcu.functions.filament) {
                if (sensor === 'filament_switch') {
                    handledSections.add('filament_switch_sensor');
                } else if (sensor === 'filament_motion') {
                    handledSections.add('filament_motion_sensor');
                }
            }
        }
    }
    
    return handledSections;
}

/**
 * Check if a section name matches any section handled by secondary MCUs
 */
function isSectionHandledBySecondaryMcu(sectionName, handledSections) {
    const name = sectionName.toLowerCase();
    
    // Direct match
    if (handledSections.has(name)) {
        return true;
    }
    
    // Check for partial matches (e.g., "heater_fan hotend_fan" should match "heater_fan")
    for (const handled of handledSections) {
        if (name.startsWith(handled) || handled.startsWith(name)) {
            // Be careful with partial matches - only for specific cases
            if (name.includes('heater_fan') && handled.includes('heater_fan')) {
                return true;
            }
            if (name.includes('filament_switch_sensor') && handled.includes('filament_switch_sensor')) {
                return true;
            }
            if (name.includes('filament_motion_sensor') && handled.includes('filament_motion_sensor')) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Get the name of the secondary MCU that handles a given section
 */
function getSecondaryMcuForSection(sectionName) {
    const name = sectionName.toLowerCase();
    const mcus = window.currentConfigData.secondaryMcus || [];
    
    for (const mcu of mcus) {
        if (!mcu.enabled || !mcu.functions) continue;
        
        // Check steppers
        if (mcu.functions.steppers) {
            for (const stepper of mcu.functions.steppers) {
                if (name === stepper || name.includes(stepper)) {
                    return mcu.name;
                }
                // Check TMC sections
                if (name.startsWith('tmc') && name.includes(stepper)) {
                    return mcu.name;
                }
            }
        }
        
        // Check heaters
        if (mcu.functions.heaters) {
            for (const heater of mcu.functions.heaters) {
                if (heater === 'hotend' && (name === 'extruder' || name.includes('tmc') && name.includes('extruder'))) {
                    return mcu.name;
                }
                if (heater === 'heater_bed' && name === 'heater_bed') {
                    return mcu.name;
                }
            }
        }
        
        // Check fans
        if (mcu.functions.fans) {
            if (mcu.functions.fans.includes('part_fan') && name === 'fan') {
                return mcu.name;
            }
            if (mcu.functions.fans.includes('hotend_fan') && name.includes('heater_fan')) {
                return mcu.name;
            }
        }
        
        // Check probing
        if (mcu.functions.probing) {
            if ((mcu.functions.probing.includes('probe') || mcu.functions.probing.includes('tap')) && name === 'probe') {
                return mcu.name;
            }
            if (mcu.functions.probing.includes('bltouch') && name === 'bltouch') {
                return mcu.name;
            }
        }
    }
    
    return 'secondary_mcu';
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
    
    // Set default functions for expansion board if not already set
    if (!mcu.functions) {
        mcu.functions = {
            steppers: ['stepper_z1', 'stepper_z2'],
            fans: ['controller_fan']
        };
    }
    
    if (window._pendingExpansionFile) {
        const file = window._pendingExpansionFile;
        const reader = new FileReader();
        
        reader.onload = (e) => {
            mcu.configData = e.target.result;
            mcu.configFile = file.name;
            mcu.displayName = `📁 ${file.name}`;
            mcu.isCustomUpload = true;
            
            // Parse the config to extract pin mappings
            mcu.parsedSections = parseSecondaryMcuSections(mcu.configData);
            
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
        
        // Parse the config to extract pin mappings
        mcu.parsedSections = parseSecondaryMcuSections(configText);
        
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
        
        // Build functions summary
        const functionsHtml = renderMcuFunctionsPanel(mcu);
        
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
                    
                    <!-- MCU Functions Panel -->
                    ${functionsHtml}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    updateSecondaryMcuCount();
}

/**
 * Render the functions panel for an MCU
 */
function renderMcuFunctionsPanel(mcu) {
    const mcuType = mcu.type || 'expansion';
    const mcuFunctions = mcu.functions || {};
    
    let html = `
        <div class="mcu-functions-panel">
            <div class="mcu-functions-header" onclick="toggleMcuFunctionsExpand('${mcu.id}')">
                <span class="mcu-functions-title">🎛️ Functions</span>
                <span class="mcu-functions-summary">${getMcuFunctionsSummary(mcuFunctions)}</span>
                <span class="mcu-functions-toggle" id="mcu-func-toggle-${mcu.id}">▼</span>
            </div>
            <div class="mcu-functions-body" id="mcu-func-body-${mcu.id}" style="display: none;">
    `;
    
    // Iterate through function categories
    for (const [categoryKey, category] of Object.entries(MCU_FUNCTIONS)) {
        // Check if this category applies to this MCU type
        if (!category.forTypes.includes(mcuType) && mcuType !== 'custom') {
            continue;
        }
        
        const categoryEnabled = mcuFunctions[categoryKey] && mcuFunctions[categoryKey].length > 0;
        
        html += `
            <div class="mcu-func-category">
                <div class="mcu-func-category-header">
                    <span class="mcu-func-icon">${category.icon}</span>
                    <span class="mcu-func-label">${category.label}</span>
                </div>
                <div class="mcu-func-options">
        `;
        
        // Sub-options
        for (const [optKey, option] of Object.entries(category.subOptions)) {
            // Check if this option applies to this MCU type
            if (!option.forTypes.includes(mcuType) && mcuType !== 'custom') {
                continue;
            }
            
            const isChecked = mcuFunctions[categoryKey] && mcuFunctions[categoryKey].includes(optKey);
            
            html += `
                <label class="mcu-func-option">
                    <input type="checkbox" 
                           ${isChecked ? 'checked' : ''}
                           onchange="toggleMcuFunction('${mcu.id}', '${categoryKey}', '${optKey}', this.checked)">
                    <span>${option.label}</span>
                </label>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
    }
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

/**
 * Get a summary of enabled functions for display
 */
function getMcuFunctionsSummary(functions) {
    if (!functions || Object.keys(functions).length === 0) {
        return '<span class="mcu-func-none">None configured</span>';
    }
    
    const enabledCategories = [];
    for (const [key, values] of Object.entries(functions)) {
        if (values && values.length > 0) {
            const category = MCU_FUNCTIONS[key];
            if (category) {
                enabledCategories.push(category.icon);
            }
        }
    }
    
    if (enabledCategories.length === 0) {
        return '<span class="mcu-func-none">None configured</span>';
    }
    
    return enabledCategories.join(' ');
}

/**
 * Toggle the functions panel expanded/collapsed
 */
function toggleMcuFunctionsExpand(mcuId) {
    const body = document.getElementById(`mcu-func-body-${mcuId}`);
    const toggle = document.getElementById(`mcu-func-toggle-${mcuId}`);
    
    if (body.style.display === 'none') {
        body.style.display = 'block';
        toggle.textContent = '▲';
    } else {
        body.style.display = 'none';
        toggle.textContent = '▼';
    }
}

/**
 * Toggle a specific function on/off for an MCU
 */
function toggleMcuFunction(mcuId, category, option, enabled) {
    const mcu = window.currentConfigData.secondaryMcus.find(m => m.id === mcuId);
    if (!mcu) return;
    
    if (!mcu.functions) {
        mcu.functions = {};
    }
    
    if (!mcu.functions[category]) {
        mcu.functions[category] = [];
    }
    
    if (enabled) {
        if (!mcu.functions[category].includes(option)) {
            mcu.functions[category].push(option);
        }
    } else {
        mcu.functions[category] = mcu.functions[category].filter(o => o !== option);
    }
    
    // Update just the summary without full re-render
    const mcuItem = document.querySelector(`[data-mcu-id="${mcuId}"]`);
    if (mcuItem) {
        const summary = mcuItem.querySelector('.mcu-functions-summary');
        if (summary) {
            summary.innerHTML = getMcuFunctionsSummary(mcu.functions);
        }
    }
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
    
    // Reset slot tracking for all MCUs before generating
    resetSecondaryMcuSlotTracking();
    
    // Ensure all MCUs have their configs parsed
    for (const mcu of mcus) {
        if (mcu.configData && !mcu.parsedSections) {
            mcu.parsedSections = parseSecondaryMcuSections(mcu.configData);
        }
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
        output += `# Pin prefix: "${mcu.name}:"\n\n`;
        
        // Generate sections based on selected functions
        output += generateMcuFunctionSections(mcu);
    }
    
    return output;
}

/**
 * Generate config sections based on the MCU's selected functions
 */
function generateMcuFunctionSections(mcu) {
    const functions = mcu.functions || {};
    const prefix = mcu.name;
    let output = '';
    
    // Generate stepper sections
    if (functions.steppers && functions.steppers.length > 0) {
        output += `# ---- Steppers on ${prefix} ----\n`;
        for (const stepper of functions.steppers) {
            output += generateStepperSection(stepper, mcu);
        }
    }
    
    // Generate heater sections
    if (functions.heaters && functions.heaters.length > 0) {
        output += `# ---- Heaters on ${prefix} ----\n`;
        for (const heater of functions.heaters) {
            output += generateHeaterSection(heater, mcu);
        }
    }
    
    // Generate fan sections
    if (functions.fans && functions.fans.length > 0) {
        output += `# ---- Fans on ${prefix} ----\n`;
        for (const fan of functions.fans) {
            output += generateFanSection(fan, mcu);
        }
    }
    
    // Generate temperature sensor sections
    if (functions.sensors && functions.sensors.length > 0) {
        output += `# ---- Temperature Sensors on ${prefix} ----\n`;
        for (const sensor of functions.sensors) {
            output += generateSensorSection(sensor, mcu);
        }
    }
    
    // Generate probe sections
    if (functions.probing && functions.probing.length > 0) {
        output += `# ---- Probing on ${prefix} ----\n`;
        for (const probe of functions.probing) {
            output += generateProbeSection(probe, mcu);
        }
    }
    
    // Generate LED sections
    if (functions.leds && functions.leds.length > 0) {
        output += `# ---- LEDs on ${prefix} ----\n`;
        for (const led of functions.leds) {
            output += generateLedSection(led, mcu);
        }
    }
    
    // Generate accelerometer sections
    if (functions.accelerometer && functions.accelerometer.length > 0) {
        output += `# ---- Accelerometer on ${prefix} ----\n`;
        for (const accel of functions.accelerometer) {
            output += generateAccelerometerSection(accel, mcu);
        }
    }
    
    // Generate filament sensor sections
    if (functions.filament && functions.filament.length > 0) {
        output += `# ---- Filament Sensors on ${prefix} ----\n`;
        for (const sensor of functions.filament) {
            output += generateFilamentSensorSection(sensor, mcu);
        }
    }
    
    // Generate GPIO sections
    if (functions.gpio && functions.gpio.length > 0) {
        output += `# ---- GPIO on ${prefix} ----\n`;
        for (const gpio of functions.gpio) {
            output += generateGpioSection(gpio, mcu);
        }
    }
    
    return output;
}

function generateStepperSection(stepper, mcu) {
    const prefix = mcu.name;
    const mainConfig = window.currentConfigData;
    
    // Map stepper names to Klipper section names
    const stepperMap = {
        'stepper_x': 'stepper_x',
        'stepper_y': 'stepper_y',
        'stepper_z': 'stepper_z',
        'stepper_z1': 'stepper_z1',
        'stepper_z2': 'stepper_z2',
        'stepper_z3': 'stepper_z3',
        'extruder': 'extruder',
        'extruder1': 'extruder1'
    };
    
    const sectionName = stepperMap[stepper] || stepper;
    
    // Try to get pins from the secondary MCU's board config
    const pinData = getSecondaryMcuStepperPins(mcu, stepper, 0);
    
    // Get default values from main config if available (for rotation_distance, etc.)
    let rotationDistance = '40';
    let microsteps = '16';
    let runCurrent = '0.800';
    
    // Try to get settings from main board's Z stepper for Z motors
    if (stepper.startsWith('stepper_z') && mainConfig.sections) {
        const mainZ = mainConfig.sections.find(s => s.name.toLowerCase() === 'stepper_z');
        if (mainZ && mainZ.content) {
            const rotMatch = mainZ.content.match(/rotation_distance:\s*([\d.]+)/);
            if (rotMatch) rotationDistance = rotMatch[1];
            const microMatch = mainZ.content.match(/microsteps:\s*(\d+)/);
            if (microMatch) microsteps = microMatch[1];
        }
        // Get run_current from TMC section
        const mainTmc = mainConfig.sections.find(s => s.name.toLowerCase().includes('tmc') && s.name.toLowerCase().includes('stepper_z'));
        if (mainTmc && mainTmc.content) {
            const currentMatch = mainTmc.content.match(/run_current:\s*([\d.]+)/);
            if (currentMatch) runCurrent = currentMatch[1];
        }
    }
    
    // Determine pin values
    let stepPin, dirPin, enablePin, uartPin;
    
    if (pinData && pinData.stepperPins) {
        stepPin = `${prefix}:${pinData.stepperPins.step_pin || 'CHANGE_ME'}`;
        dirPin = `${prefix}:${pinData.stepperPins.dir_pin || 'CHANGE_ME'}`;
        enablePin = pinData.stepperPins.enable_pin || 'CHANGE_ME';
        // Handle enable pin polarity (usually inverted)
        if (!enablePin.startsWith('!') && !enablePin.startsWith('^')) {
            enablePin = `!${prefix}:${enablePin}`;
        } else {
            enablePin = `${prefix}:${enablePin}`;
        }
        
        if (pinData.tmcPins) {
            uartPin = `${prefix}:${pinData.tmcPins.uart_pin || 'CHANGE_ME'}`;
        } else {
            uartPin = `${prefix}:CHANGE_ME`;
        }
    } else {
        stepPin = `${prefix}:CHANGE_ME`;
        dirPin = `${prefix}:CHANGE_ME`;
        enablePin = `!${prefix}:CHANGE_ME`;
        uartPin = `${prefix}:CHANGE_ME`;
    }
    
    let output = `[${sectionName}]\n`;
    output += `step_pin: ${stepPin}\n`;
    output += `dir_pin: ${dirPin}\n`;
    output += `enable_pin: ${enablePin}\n`;
    output += `microsteps: ${microsteps}\n`;
    
    if (stepper === 'extruder' || stepper === 'extruder1') {
        output += `rotation_distance: 22.6789511  # Calibrate this!\n`;
        output += `nozzle_diameter: 0.400\n`;
        output += `filament_diameter: 1.750\n`;
        output += `max_extrude_only_distance: 100.0\n`;
        runCurrent = '0.650';
    } else {
        output += `rotation_distance: ${rotationDistance}\n`;
    }
    
    // Add position settings for non-additional Z steppers
    if (stepper === 'stepper_z') {
        const bedZ = mainConfig.defaultValues?.bedZ || 250;
        output += `endstop_pin: CHANGE_ME  # Or use probe:z_virtual_endstop\n`;
        output += `position_max: ${bedZ}\n`;
        output += `position_min: -5\n`;
        output += `homing_speed: 8\n`;
    }
    
    output += `\n`;
    
    // Add TMC section for the stepper
    output += `[tmc2209 ${sectionName}]\n`;
    output += `uart_pin: ${uartPin}\n`;
    output += `run_current: ${runCurrent}\n`;
    output += `stealthchop_threshold: 999999\n`;
    
    // Add source comment if we found pins
    if (pinData && pinData.sourceSlot) {
        output += `# Pins from ${mcu.configFile || 'board config'} ${pinData.sourceSlot} slot\n`;
    }
    
    output += `\n`;
    
    return output;
}

function generateHeaterSection(heater, mcu) {
    const prefix = mcu.name;
    
    // Try to get heater pins from board config
    let heaterPin = `${prefix}:CHANGE_ME`;
    let sensorPin = `${prefix}:CHANGE_ME`;
    
    if (mcu.parsedSections) {
        if (heater === 'hotend' && mcu.parsedSections['extruder']) {
            const pins = mcu.parsedSections['extruder'].pins;
            if (pins.heater_pin) heaterPin = `${prefix}:${pins.heater_pin}`;
            if (pins.sensor_pin) sensorPin = `${prefix}:${pins.sensor_pin}`;
        } else if (heater === 'heater_bed' && mcu.parsedSections['heater_bed']) {
            const pins = mcu.parsedSections['heater_bed'].pins;
            if (pins.heater_pin) heaterPin = `${prefix}:${pins.heater_pin}`;
            if (pins.sensor_pin) sensorPin = `${prefix}:${pins.sensor_pin}`;
        }
    }
    
    if (heater === 'hotend') {
        return `[extruder]
# Hotend heater on ${prefix}
heater_pin: ${heaterPin}
sensor_type: EPCOS 100K B57560G104F
sensor_pin: ${sensorPin}
control: pid
pid_Kp: 21.527
pid_Ki: 1.063
pid_Kd: 108.982
min_temp: 0
max_temp: 280

`;
    } else if (heater === 'heater_bed') {
        return `[heater_bed]
# Heated bed on ${prefix}
heater_pin: ${heaterPin}
sensor_type: Generic 3950
sensor_pin: ${sensorPin}
control: pid
pid_Kp: 54.027
pid_Ki: 0.770
pid_Kd: 948.182
min_temp: 0
max_temp: 130

`;
    } else if (heater === 'heater_chamber') {
        return `[heater_generic chamber_heater]
# Chamber heater on ${prefix}
heater_pin: ${heaterPin}
sensor_type: Generic 3950
sensor_pin: ${sensorPin}
control: watermark
max_delta: 2.0
min_temp: 0
max_temp: 70

`;
    }
    return '';
}

function generateFanSection(fan, mcu) {
    const prefix = mcu.name;
    
    // Try to get fan pins from board config
    let fanPin = `${prefix}:CHANGE_ME`;
    
    if (mcu.parsedSections) {
        if (fan === 'part_fan' && mcu.parsedSections['fan']) {
            const pins = mcu.parsedSections['fan'].pins;
            if (pins.pin) fanPin = `${prefix}:${pins.pin}`;
        } else if (fan === 'hotend_fan' && mcu.parsedSections['heater_fan hotend_fan']) {
            const pins = mcu.parsedSections['heater_fan hotend_fan'].pins;
            if (pins.pin) fanPin = `${prefix}:${pins.pin}`;
        } else if (mcu.parsedSections['fan_generic']) {
            const pins = mcu.parsedSections['fan_generic'].pins;
            if (pins.pin) fanPin = `${prefix}:${pins.pin}`;
        }
    }

    const fanConfigs = {
        'part_fan': `[fan]
# Part cooling fan on ${prefix}
pin: ${fanPin}

`,
        'hotend_fan': `[heater_fan hotend_fan]
# Hotend cooling fan on ${prefix}
pin: ${fanPin}
heater: extruder
heater_temp: 50.0

`,
        'controller_fan': `[controller_fan controller_fan]
# Controller/electronics fan on ${prefix}
pin: ${prefix}:CHANGE_ME
kick_start_time: 0.5
heater: heater_bed

`,
        'exhaust_fan': `[fan_generic exhaust_fan]
# Exhaust fan on ${prefix}
pin: ${prefix}:CHANGE_ME

`,
        'filter_fan': `[fan_generic nevermore]
# Nevermore/filter fan on ${prefix}
pin: ${prefix}:CHANGE_ME

`
    };
    
    return fanConfigs[fan] || '';
}

function generateSensorSection(sensor, mcu) {
    const prefix = mcu.name;
    
    const sensorConfigs = {
        'hotend_temp': '', // Usually part of extruder section
        'bed_temp': '', // Usually part of heater_bed section
        'chamber_temp': `[temperature_sensor chamber]
# Chamber temperature sensor on ${prefix}
sensor_type: Generic 3950
sensor_pin: ${prefix}:CHANGE_ME

`,
        'mcu_temp': `[temperature_sensor ${prefix}_mcu]
# MCU temperature for ${prefix}
sensor_type: temperature_mcu
sensor_mcu: ${prefix}

`
    };
    
    return sensorConfigs[sensor] || '';
}

function generateProbeSection(probe, mcu) {
    const prefix = mcu.name;
    
    // Try to get probe pins from board config
    let probePin = `${prefix}:CHANGE_ME`;
    let controlPin = `${prefix}:CHANGE_ME`;
    
    if (mcu.parsedSections) {
        if (mcu.parsedSections['probe']) {
            const pins = mcu.parsedSections['probe'].pins;
            if (pins.pin) probePin = `${prefix}:${pins.pin}`;
        }
        if (mcu.parsedSections['bltouch']) {
            const pins = mcu.parsedSections['bltouch'].pins;
            if (pins.sensor_pin) probePin = `^${prefix}:${pins.sensor_pin.replace('^', '')}`;
            if (pins.control_pin) controlPin = `${prefix}:${pins.control_pin}`;
        }
    }
    
    if (probe === 'probe') {
        return `[probe]
# Probe on ${prefix}
pin: ${probePin}
x_offset: 0
y_offset: 25.0
#z_offset: 0  # Set via PROBE_CALIBRATE
speed: 10.0
samples: 3
samples_result: median
sample_retract_dist: 3.0
samples_tolerance: 0.006
samples_tolerance_retries: 3

`;
    } else if (probe === 'bltouch') {
        return `[bltouch]
# BLTouch on ${prefix}
sensor_pin: ${probePin}
control_pin: ${controlPin}
x_offset: -40
y_offset: -10
#z_offset: 0  # Set via PROBE_CALIBRATE
speed: 10.0
samples: 3
sample_retract_dist: 5.0

`;
    } else if (probe === 'tap') {
        return `[probe]
# Voron Tap on ${prefix}
pin: ${probePin}
x_offset: 0
y_offset: 0
#z_offset: 0  # Set via PROBE_CALIBRATE
speed: 5.0
samples: 3
samples_result: median
sample_retract_dist: 2.0
samples_tolerance: 0.006
samples_tolerance_retries: 3
activate_gcode:
    {% set PROBE_TEMP = 150 %}
    {% set MAX_TEMP = PROBE_TEMP + 5 %}
    {% set ACTUAL_TEMP = printer.extruder.temperature %}
    {% set TARGET_TEMP = printer.extruder.target %}

    {% if TARGET_TEMP > PROBE_TEMP %}
        { action_respond_info('Extruder temperature target of %.1fC is too high, lowering to %.1fC' % (TARGET_TEMP, PROBE_TEMP)) }
        M109 S{ PROBE_TEMP }
    {% else %}
        # Temperature target is already low enough, but nozzle may still be too hot.
        {% if ACTUAL_TEMP > MAX_TEMP %}
            { action_respond_info('Extruder temperature %.1fC is still too high, waiting until below %.1fC' % (ACTUAL_TEMP, MAX_TEMP)) }
            TEMPERATURE_WAIT SENSOR=extruder MAXIMUM={ MAX_TEMP }
        {% endif %}
    {% endif %}

`;
    }
    return '';
}

function generateLedSection(led, mcu) {
    const prefix = mcu.name;
    
    if (led === 'toolhead_leds') {
        return `[neopixel sb_leds]
# Stealthburner LEDs on ${prefix}
pin: ${prefix}:CHANGE_ME
chain_count: 3
color_order: GRBW
initial_RED: 0.0
initial_GREEN: 0.0
initial_BLUE: 0.0
initial_WHITE: 0.0

`;
    } else if (led === 'case_leds') {
        return `[neopixel case_leds]
# Case/chamber LEDs on ${prefix}
pin: ${prefix}:CHANGE_ME
chain_count: 24
color_order: GRB
initial_RED: 0.2
initial_GREEN: 0.2
initial_BLUE: 0.2

`;
    } else if (led === 'status_led') {
        return `[output_pin status_led]
# Status LED on ${prefix}
pin: ${prefix}:CHANGE_ME
value: 0

`;
    }
    return '';
}

function generateAccelerometerSection(accel, mcu) {
    const prefix = mcu.name;
    
    // Try to get ADXL pins from board config
    let csPin = `${prefix}:CHANGE_ME`;
    let sclkPin = `${prefix}:CHANGE_ME`;
    let mosiPin = `${prefix}:CHANGE_ME`;
    let misoPin = `${prefix}:CHANGE_ME`;
    
    if (mcu.parsedSections && mcu.parsedSections['adxl345']) {
        const pins = mcu.parsedSections['adxl345'].pins;
        if (pins.cs_pin) csPin = `${prefix}:${pins.cs_pin}`;
        if (pins.spi_software_sclk_pin) sclkPin = `${prefix}:${pins.spi_software_sclk_pin}`;
        if (pins.spi_software_mosi_pin) mosiPin = `${prefix}:${pins.spi_software_mosi_pin}`;
        if (pins.spi_software_miso_pin) misoPin = `${prefix}:${pins.spi_software_miso_pin}`;
    }
    
    if (accel === 'adxl345') {
        if (prefix === 'host') {
            return `[adxl345]
# ADXL345 on Raspberry Pi
cs_pin: rpi:None

[resonance_tester]
accel_chip: adxl345
probe_points: 150, 150, 20  # Adjust to your bed center

`;
        }
        return `[adxl345]
# ADXL345 on ${prefix}
cs_pin: ${csPin}
spi_software_sclk_pin: ${sclkPin}
spi_software_mosi_pin: ${mosiPin}
spi_software_miso_pin: ${misoPin}
axes_map: x,y,z

[resonance_tester]
accel_chip: adxl345
probe_points: 150, 150, 20  # Adjust to your bed center

`;
    } else if (accel === 'lis2dw') {
        return `[lis2dw]
# LIS2DW accelerometer on ${prefix}
cs_pin: ${csPin}
spi_software_sclk_pin: ${sclkPin}
spi_software_mosi_pin: ${mosiPin}
spi_software_miso_pin: ${misoPin}

[resonance_tester]
accel_chip: lis2dw
probe_points: 150, 150, 20  # Adjust to your bed center

`;
    }
    return '';
}

function generateFilamentSensorSection(sensor, mcu) {
    const prefix = mcu.name;
    
    if (sensor === 'filament_switch') {
        return `[filament_switch_sensor filament_sensor]
# Filament switch sensor on ${prefix}
switch_pin: ${prefix}:CHANGE_ME
pause_on_runout: True
runout_gcode:
    PAUSE
insert_gcode:
    M117 Filament inserted

`;
    } else if (sensor === 'filament_motion') {
        return `[filament_motion_sensor filament_motion]
# Filament motion sensor on ${prefix}
switch_pin: ${prefix}:CHANGE_ME
detection_length: 7.0
extruder: extruder
pause_on_runout: True
runout_gcode:
    PAUSE

`;
    }
    return '';
}

function generateGpioSection(gpio, mcu) {
    const prefix = mcu.name;
    
    if (gpio === 'relay') {
        return `[output_pin relay]
# Relay control on ${prefix}
pin: ${prefix}:CHANGE_ME
value: 0
shutdown_value: 0

`;
    } else if (gpio === 'button') {
        return `[gcode_button my_button]
# Button on ${prefix}
pin: ^${prefix}:CHANGE_ME
press_gcode:
    M117 Button pressed!

`;
    } else if (gpio === 'power_control') {
        return `[output_pin ps_on]
# Power supply control on ${prefix}
pin: ${prefix}:CHANGE_ME
value: 1
shutdown_value: 0

`;
    }
    return '';
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
    
    // Get sections that are handled by secondary MCUs - these should be commented out
    const sectionsHandledBySecondaryMcus = getSectionsHandledBySecondaryMcus();
    
    let lines = rawConfig.split('\n');
    
    const saveConfigStart = lines.findIndex(line => 
        line.includes('#*# <---------------------- SAVE_CONFIG ---------------------->')
    );
    
    let includesBlock = generateIncludesBlock();
    
    let output = '';
    let currentSectionIndex = -1;
    let currentSectionName = '';
    let inSaveConfig = false;
    let sectionHandledBySecondaryMcu = false;
    let i = 0;
    
    // Add disclaimer header
    output += '##########################################################\n';
    output += '#  Made with Fairline Klipper Config Generator           #\n';
    output += '#  by Kanrog Creations                                   #\n';
    output += '#  https://github.com/Kanrog/klipper-config-generator    #\n';
    output += '#                                                        #\n';
    output += '#  USE AT YOUR OWN RISK                                  #\n';
    output += '#  Always review and test your config carefully!         #\n';
    output += '##########################################################\n\n';
    
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
            currentSectionName = sectionMatch[2].trim().toLowerCase();
            
            // Check if this section is handled by a secondary MCU
            sectionHandledBySecondaryMcu = isSectionHandledBySecondaryMcu(currentSectionName, sectionsHandledBySecondaryMcus);
        }
        
        const isCurrentSectionSelected = currentSectionIndex !== -1 && 
                                        selectedIndices.includes(currentSectionIndex);
        
        if (currentSectionIndex === -1) {
            output += line + '\n';
            i++;
        } else {
            const section = sections[currentSectionIndex];
            const wasCommented = section.originallyCommented;
            
            // If section is handled by secondary MCU, comment it out with a note
            if (sectionHandledBySecondaryMcu) {
                let processedLine = line;
                
                // Add note at section header
                if (sectionMatch && line.includes('[')) {
                    const mcuName = getSecondaryMcuForSection(currentSectionName);
                    if (!line.trim().startsWith('#')) {
                        processedLine = `# ${line}  # MOVED TO SECONDARY MCU: ${mcuName}`;
                    } else {
                        processedLine = line;
                    }
                } else if (!line.trim().startsWith('#') && line.trim() !== '') {
                    processedLine = '# ' + line;
                }
                
                output += processedLine + '\n';
                i++;
            } else if (isCurrentSectionSelected) {
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
    
    // Get sections handled by secondary MCUs
    const sectionsHandledBySecondaryMcus = getSectionsHandledBySecondaryMcus();
    
    const separator = '#=====================================#\n';
    let cfg = '';
    
    // Check if any Z motors need to be generated on main MCU
    let motorsToGenerate = [];
    for (let i = 1; i < settings.zMotorCount; i++) {
        const stepperName = `stepper_z${i}`;
        if (!sectionsHandledBySecondaryMcus.has(stepperName)) {
            motorsToGenerate.push(i);
        }
    }
    
    // If all additional Z motors are on secondary MCUs, don't generate anything
    if (motorsToGenerate.length === 0) {
        // Still generate z_tilt or QGL if needed
        if (settings.zLevelingType === 'z_tilt' || settings.zLevelingType === 'quad_gantry_level') {
            cfg += `${separator}`;
            cfg += `# Z LEVELING CONFIGURATION\n`;
            cfg += `${separator}\n\n`;
            cfg += generateZLevelingSection(settings);
        }
        return cfg;
    }
    
    cfg += `${separator}`;
    cfg += `# ADDITIONAL Z MOTORS (Generated)\n`;
    cfg += `${separator}\n\n`;
    
    const stepperZ = sections.find(s => s.name.toLowerCase() === 'stepper_z');
    const stepperZContent = stepperZ ? stepperZ.content : '';
    
    const rotDistMatch = stepperZContent.match(/rotation_distance:\s*([\d.]+)/);
    const rotationDistance = rotDistMatch ? rotDistMatch[1] : '8';
    
    const microMatch = stepperZContent.match(/microsteps:\s*(\d+)/);
    const microsteps = microMatch ? microMatch[1] : '16';
    
    for (const i of motorsToGenerate) {
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
        
        for (const i of motorsToGenerate) {
            cfg += `[${tmcType} stepper_z${i}]\n`;
            cfg += `uart_pin: CHANGE_ME\n`;
            cfg += `run_current: ${runCurrent}\n`;
            cfg += `stealthchop_threshold: 999999\n\n`;
        }
    }
    
    cfg += generateZLevelingSection(settings);
    
    return cfg;
}

/**
 * Generate Z leveling section (z_tilt or quad_gantry_level)
 */
function generateZLevelingSection(settings) {
    let cfg = '';
    
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
        } else if (settings.zMotorCount === 4) {
            cfg += `    -50, -50\n`;
            cfg += `    -50, ${settings.bedY + 50}\n`;
            cfg += `    ${settings.bedX + 50}, ${settings.bedY + 50}\n`;
            cfg += `    ${settings.bedX + 50}, -50\n`;
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
