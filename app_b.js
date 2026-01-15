const REPO_OWNER = "Kanrog";
const REPO_NAME = "klipper-config-generator";
const CONFIG_FOLDER = "config-examples";

// Store the current config data globally
window.currentConfigData = {
    raw: '',
    sections: [],
    fileName: '',
    driverCount: 0,  // Total stepper drivers available on the board
    saveConfigBlock: '',  // Preserved SAVE_CONFIG section from uploaded configs
    defaultValues: {}  // Default values extracted from config (bed size, etc.)
};

// Kinematics definitions with descriptions and settings
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

/**
 * Count the number of stepper drivers available on the board
 * Uses multiple detection methods for accuracy
 */
function countStepperDrivers(configText) {
    if (!configText) return 0;
    
    const lines = configText.split('\n');
    
    // METHOD 1: Count TMC driver sections (most reliable)
    // Each [tmc2209 stepper_x] etc. represents a physical driver
    const tmcSections = new Set();
    const tmcPattern = /^#*\s*\[(tmc\d+)\s+(stepper_[xyzabc]\d*|extruder\d*)\]/i;
    
    for (const line of lines) {
        const match = line.trim().match(tmcPattern);
        if (match) {
            // Extract the stepper name (e.g., "stepper_x", "extruder", "stepper_a")
            const stepperName = match[2].toLowerCase();
            tmcSections.add(stepperName);
        }
    }
    
    // If we found TMC sections, that's our most reliable count
    if (tmcSections.size > 0) {
        console.log('Found TMC sections:', tmcSections);
        return tmcSections.size;
    }
    
    // METHOD 2: Try to detect board type from comments
    const boardPatterns = [
        // Format: [pattern, driver_count]
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
    
    // Check first 50 lines for board identification
    const headerText = lines.slice(0, 50).join('\n');
    for (const { pattern, drivers } of boardPatterns) {
        if (pattern.test(headerText)) {
            console.log('Detected board pattern:', pattern, 'drivers:', drivers);
            return drivers;
        }
    }
    
    // METHOD 3: Count all stepper sections (both active and commented)
    // Includes both cartesian (x,y,z) and delta (a,b,c) steppers
    const allStepperSections = new Set();
    const stepperPattern = /^#*\s*\[(?:stepper_[xyzabc]\d*|extruder\d*)\]/i;
    
    for (const line of lines) {
        const match = line.trim().match(stepperPattern);
        if (match) {
            // Normalize the section name
            const normalized = match[0]
                .replace(/^#*\s*\[/, '')
                .replace(/\]/, '')
                .toLowerCase();
            allStepperSections.add(normalized);
        }
    }
    
    console.log('Found stepper sections:', allStepperSections);
    
    // If we found any sections, return that count
    if (allStepperSections.size > 0) {
        return allStepperSections.size;
    }
    
    // Default fallback
    return 4;
}

/**
 * Calculate total drivers needed based on current settings
 */
function calculateRequiredDrivers() {
    const kinematicsSelect = document.getElementById('kinematicsSelect');
    const zMotorCount = parseInt(document.getElementById('zMotorCount').value);
    const kinematics = KINEMATICS[kinematicsSelect.value];
    
    let required = 0;
    
    // X and Y motors (or A/B for CoreXY, or towers for delta)
    if (kinematics.usesDelta) {
        required = 3; // stepper_a, stepper_b, stepper_c
    } else {
        required = 2; // stepper_x, stepper_y
    }
    
    // Z motors
    if (!kinematics.usesDelta) {
        required += zMotorCount;
    }
    
    // Extruder
    required += 1;
    
    return required;
}

/**
 * Update driver warning display
 */
function updateDriverWarning() {
    const required = calculateRequiredDrivers();
    const available = window.currentConfigData.driverCount;
    
    // Update driver count display
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
    
    // Create or update warning element
    let warningEl = document.getElementById('driverWarning');
    
    if (required > available && available > 0) {
        if (!warningEl) {
            warningEl = document.createElement('div');
            warningEl.id = 'driverWarning';
            warningEl.className = 'driver-warning';
            
            // Insert after Z motors group
            const zMotorsGroup = document.getElementById('zMotorsGroup');
            zMotorsGroup.parentNode.insertBefore(warningEl, zMotorsGroup.nextSibling);
        }
        
        warningEl.innerHTML = `
            <div class="warning-icon">⚠️</div>
            <div class="warning-content">
                <strong>Insufficient Stepper Drivers</strong>
                <p>This configuration requires <strong>${required} drivers</strong> but the selected board only has <strong>${available} drivers</strong>.</p>
                <p>You will need to set up a <strong>multi-MCU configuration</strong> with an additional board, or reduce the number of motors.</p>
            </div>
        `;
        warningEl.style.display = 'flex';
    } else if (warningEl) {
        warningEl.style.display = 'none';
    }
}

/**
 * Update UI based on selected kinematics
 */
function updateKinematicsOptions() {
    const kinematicsSelect = document.getElementById('kinematicsSelect');
    const selected = kinematicsSelect.value;
    const kinematics = KINEMATICS[selected];
    
    // Update hint text
    document.getElementById('kinematicsHint').textContent = kinematics.hint;
    
    // Toggle between cartesian and delta dimension inputs
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
    
    // Show/hide X/Y endstop options
    const xyEndstopOptions = document.getElementById('xyEndstopOptions');
    if (kinematics.usesXYEndstops) {
        xyEndstopOptions.style.display = 'block';
    } else {
        xyEndstopOptions.style.display = 'none';
    }
    
    // For delta, default Z endstop to max (top of towers)
    if (selected === 'delta') {
        document.getElementById('zEndstopType').value = 'switch_max';
        updateZEndstopOptions();
    }
    
    // Hide Z motors config for delta (delta uses stepper_a/b/c instead)
    const zMotorsGroup = document.getElementById('zMotorsGroup');
    if (kinematics.usesDelta) {
        zMotorsGroup.style.display = 'none';
    } else {
        zMotorsGroup.style.display = 'block';
    }
    
    // Update driver warning
    updateDriverWarning();
}

/**
 * Update warnings for sensorless homing configuration
 */
function updateSensorlessWarning() {
    const sensorlessCheckbox = document.getElementById('sensorlessXY');
    const defaults = window.currentConfigData?.defaultValues || {};
    
    // Remove existing warning
    let warningEl = document.getElementById('sensorlessWarning');
    if (warningEl) {
        warningEl.remove();
    }
    
    // If sensorless is DISABLED but config has sensorless enabled (no physical endstops)
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
        
        const checkbox = document.querySelector('.checkbox-group:has(#sensorlessXY)');
        checkbox.parentNode.insertBefore(warningEl, checkbox.nextSibling);
    }
}

/**
 * Update UI based on Z motor count selection
 */
function updateZMotorOptions() {
    const count = parseInt(document.getElementById('zMotorCount').value);
    const zTiltOptions = document.getElementById('zTiltOptions');
    const quadGantryOptions = document.getElementById('quadGantryOptions');
    
    // Hide all first
    zTiltOptions.style.display = 'none';
    quadGantryOptions.style.display = 'none';
    
    if (count === 2 || count === 3) {
        // Show z_tilt options for dual/triple Z
        zTiltOptions.style.display = 'block';
        document.getElementById('zTiltHint').textContent = 
            count === 2 
                ? 'Levels the gantry using 2 Z motors (front/back or left/right)'
                : 'Levels the gantry using 3 Z motors (typically triangle pattern)';
    } else if (count === 4) {
        // Show quad gantry options
        quadGantryOptions.style.display = 'block';
    }
    
    // Update driver warning
    updateDriverWarning();
}

// 1. Fetch board list from GitHub Repo and populate searchable dropdown
window.onload = async () => {
    const select = document.getElementById('boardSelect');
    const searchInput = document.getElementById('boardSearch');
    
    try {
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${CONFIG_FOLDER}`);
        const files = await response.json();

        // Store all options for filtering
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
        
        // Enable search input
        searchInput.disabled = false;
        searchInput.placeholder = 'Search boards...';
        
        // Load sections for the first board
        if (select.value) {
            loadConfigFromRepo(select.value);
        }
        
    } catch (err) {
        select.innerHTML = '<option>Error loading repo files</option>';
        console.error(err);
    }
};

// Board search/filter functionality
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

// Load config from GitHub repo
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

// Handle user-uploaded config file
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.endsWith('.cfg')) {
        alert('Please upload a .cfg file');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const configText = e.target.result;
        processConfig(configText, file.name);
        
        // Update UI to show uploaded file
        document.getElementById('uploadedFileName').textContent = `Loaded: ${file.name}`;
        document.getElementById('uploadedFileName').style.display = 'block';
        
        // Add to board options temporarily
        const select = document.getElementById('boardSelect');
        const option = document.createElement('option');
        option.value = '__uploaded__';
        option.textContent = `📁 ${file.name} (uploaded)`;
        option.selected = true;
        select.insertBefore(option, select.firstChild);
    };
    reader.readAsText(file);
}

// Process config text (from repo or upload)
function processConfig(configText, fileName) {
    const sections = parseConfigSections(configText);
    const driverCount = countStepperDrivers(configText);
    const saveConfigBlock = extractSaveConfig(configText);
    const savedValues = parseSavedValues(saveConfigBlock);
    const defaultValues = extractDefaultValues(configText, sections);
    
    window.currentConfigData = {
        raw: configText,
        sections: sections,
        fileName: fileName,
        driverCount: driverCount,
        saveConfigBlock: saveConfigBlock,
        savedValues: savedValues,
        defaultValues: defaultValues
    };
    
    // Populate UI with default values
    populateDefaultValues(defaultValues);
    
    renderSectionCheckboxes(sections);
    updateDriverWarning();
    updateSensorlessWarning();
}

/**
 * Populate UI fields with default values from the config
 */
function populateDefaultValues(defaults) {
    // Set kinematics if available (do this first as it affects UI)
    if (defaults.kinematics) {
        const kinematicsSelect = document.getElementById('kinematicsSelect');
        // Try to find matching kinematics
        for (const [key, value] of Object.entries(KINEMATICS)) {
            if (value.klipperName === defaults.kinematics) {
                kinematicsSelect.value = key;
                updateKinematicsOptions();
                break;
            }
        }
    }
    
    // Check if this is a delta config
    const isDelta = defaults.kinematics === 'delta';
    
    if (isDelta) {
        // Populate delta-specific fields
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
            document.getElementById('deltaArmLength').placeholder = `Default: ${defaults.deltaArmLength}`;
        }
    } else {
        // Populate cartesian bed dimensions
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
    
    // Set probe offsets if available (works for both delta and cartesian)
    if (defaults.probeOffsetX !== undefined) {
        document.getElementById('probeOffsetX').value = defaults.probeOffsetX;
        document.getElementById('probeOffsetX').placeholder = `Default: ${defaults.probeOffsetX}`;
    }
    if (defaults.probeOffsetY !== undefined) {
        document.getElementById('probeOffsetY').value = defaults.probeOffsetY;
        document.getElementById('probeOffsetY').placeholder = `Default: ${defaults.probeOffsetY}`;
    }
}

/**
 * Extract the SAVE_CONFIG block from a config file
 * Returns the entire block including the header
 */
function extractSaveConfig(configText) {
    const lines = configText.split('\n');
    const saveConfigStart = lines.findIndex(line => 
        line.includes('#*# <---------------------- SAVE_CONFIG ---------------------->')
    );
    
    if (saveConfigStart === -1) {
        return '';
    }
    
    // Get everything from SAVE_CONFIG marker to end of file
    const saveConfigLines = lines.slice(saveConfigStart);
    return saveConfigLines.join('\n');
}

/**
 * Extract saved values from SAVE_CONFIG block
 * Returns object like { 'extruder.control': 'pid', 'extruder.pid_kp': '34.413', ... }
 */
function parseSavedValues(saveConfigBlock) {
    const savedValues = {};
    if (!saveConfigBlock) return savedValues;
    
    const lines = saveConfigBlock.split('\n');
    let currentSection = null;
    
    for (const line of lines) {
        // Check for section headers like #*# [extruder]
        const sectionMatch = line.match(/^#\*#\s*\[([^\]]+)\]/);
        if (sectionMatch) {
            currentSection = sectionMatch[1].toLowerCase();
            continue;
        }
        
        // Check for key-value pairs like #*# control = pid
        const valueMatch = line.match(/^#\*#\s*([a-z_]+)\s*=\s*(.+)$/);
        if (valueMatch && currentSection) {
            const key = `${currentSection}.${valueMatch[1]}`;
            savedValues[key] = valueMatch[2].trim();
        }
    }
    
    return savedValues;
}

/**
 * Parse ALL sections from config, extracting full content
 * Handles both [section] and #[section] (commented)
 */
function parseConfigSections(configText) {
    const sections = [];
    const lines = configText.split('\n');
    const sectionRegex = /^(\s*#\s*)?\[([^\]]+)\]/;
    
    let currentSection = null;
    
    // Find where SAVE_CONFIG starts so we don't parse it as sections
    const saveConfigStart = lines.findIndex(line => 
        line.includes('#*# <---------------------- SAVE_CONFIG ---------------------->')
    );
    const parseUntil = saveConfigStart !== -1 ? saveConfigStart : lines.length;
    
    for (let i = 0; i < parseUntil; i++) {
        const line = lines[i];
        const match = line.match(sectionRegex);
        
        if (match) {
            // Save previous section
            if (currentSection) {
                currentSection.endLine = i - 1;
                currentSection.content = extractSectionContent(lines, currentSection.startLine, currentSection.endLine);
                sections.push(currentSection);
            }
            
            const isCommented = !!match[1];
            const sectionName = match[2].trim();
            
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
    
    // Don't forget the last section (before SAVE_CONFIG)
    if (currentSection) {
        currentSection.endLine = parseUntil - 1;
        currentSection.content = extractSectionContent(lines, currentSection.startLine, currentSection.endLine);
        sections.push(currentSection);
    }
    
    return sections;
}

/**
 * Extract the raw content of a section (including the header)
 * Cleans up trailing content and removes standalone comment blocks
 */
function extractSectionContent(lines, startLine, endLine) {
    // Trim trailing empty lines
    while (endLine > startLine && lines[endLine].trim() === '') {
        endLine--;
    }
    
    let content = lines.slice(startLine, endLine + 1).join('\n');
    
    return content.trim();
}

/**
 * Extract default values from the config
 * Returns object with bed dimensions, rotation_distance, etc.
 * Handles both cartesian (x,y,z) and delta (a,b,c) configurations
 */
function extractDefaultValues(configText, sections) {
    const defaults = {};
    
    // Extract kinematics from printer section first to determine stepper layout
    const printer = sections.find(s => s.name.toLowerCase() === 'printer');
    if (printer) {
        const match = printer.content.match(/kinematics:\s*(\w+)/);
        if (match) defaults.kinematics = match[1].toLowerCase();
    }
    
    const isDelta = defaults.kinematics === 'delta';
    
    // Check for physical endstops in stepper sections
    defaults.hasPhysicalEndstopX = false;
    defaults.hasPhysicalEndstopY = false;
    defaults.hasPhysicalEndstopZ = false;
    
    const stepperX = sections.find(s => s.name.toLowerCase() === 'stepper_x');
    const stepperY = sections.find(s => s.name.toLowerCase() === 'stepper_y');
    const stepperZ = sections.find(s => s.name.toLowerCase() === 'stepper_z');
    
    if (stepperX) {
        // Check if there's a physical endstop pin (not virtual_endstop or probe)
        // Look for endstop_pin: followed by anything that's not virtual_endstop or probe:
        const endstopMatch = stepperX.content.match(/(?:^|#\s*)endstop_pin:\s*([^#\n]+)/m);
        if (endstopMatch) {
            const pin = endstopMatch[1].trim();
            // It's a physical pin if it doesn't contain these keywords
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
        // Delta printer - extract delta-specific parameters
        const stepperA = sections.find(s => s.name.toLowerCase() === 'stepper_a');
        const stepperB = sections.find(s => s.name.toLowerCase() === 'stepper_b');
        const stepperC = sections.find(s => s.name.toLowerCase() === 'stepper_c');
        
        // Extract arm_length from any tower (they should all be the same)
        if (stepperA) {
            const armMatch = stepperA.content.match(/arm_length:\s*([\d.]+)/);
            if (armMatch) defaults.deltaArmLength = parseFloat(armMatch[1]);
        }
        
        // Extract print radius and height from printer section
        if (printer) {
            const radiusMatch = printer.content.match(/print_radius:\s*([\d.]+)/);
            const heightMatch = printer.content.match(/minimum_z_position:\s*([-\d.]+)/);
            const maxZMatch = printer.content.match(/maximum_z_velocity:\s*([\d.]+)/);
            
            if (radiusMatch) defaults.deltaRadius = parseFloat(radiusMatch[1]);
            
            // Delta height can be tricky - look for position_endstop in stepper_a
            if (stepperA) {
                const endstopMatch = stepperA.content.match(/position_endstop:\s*([\d.]+)/);
                if (endstopMatch) defaults.deltaHeight = parseFloat(endstopMatch[1]);
            }
        }
        
    } else {
        // Cartesian/CoreXY printer - extract bed dimensions from stepper sections
        const stepperX = sections.find(s => s.name.toLowerCase() === 'stepper_x');
        const stepperY = sections.find(s => s.name.toLowerCase() === 'stepper_y');
        const stepperZ = sections.find(s => s.name.toLowerCase() === 'stepper_z');
        
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
    
    // Extract probe offsets if present (works for both delta and cartesian)
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

/**
 * Clean section content for output - only removes truly decorative separators
 * Preserves all user comments and explanations
 */
function cleanSectionContent(content) {
    // ONLY remove standalone separator lines that are purely decorative
    // Pattern: lines with 10+ consecutive # or = characters and nothing else meaningful
    const lines = content.split('\n');
    const cleaned = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip lines that are ONLY separators (######### or ========= etc.)
        // But keep lines that have actual text content
        const isSeparatorOnly = /^[#=\-_*]{10,}$/.test(line);
        
        if (isSeparatorOnly) {
            continue; // Skip this line
        }
        
        cleaned.push(lines[i]);
    }
    
    let result = cleaned.join('\n');
    
    // Clean up excessive blank lines (3+ in a row)
    result = result.replace(/\n{4,}/g, '\n\n\n');
    
    return result.trim();
}

/**
 * Categorize sections for UI grouping
 */
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

/**
 * Render section checkboxes in the UI, grouped by category
 */
function renderSectionCheckboxes(sections) {
    const container = document.getElementById('sections-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (sections.length === 0) {
        container.innerHTML = '<div style="color: #ef4444;">No sections found in config file.</div>';
        return;
    }
    
    // Group by category
    const categories = {};
    sections.forEach((section, index) => {
        const category = categorizeSection(section.name);
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push({ ...section, index });
    });
    
    // Category render order
    const categoryOrder = [
        'Core', 'MCU', 'Steppers', 'TMC Drivers', 'Extruders', 
        'Heaters', 'Fans', 'Probing', 'Sensors', 'Lighting', 'Pins', 'Macros', 'Menu', 'Other'
    ];
    
    categoryOrder.forEach(category => {
        if (!categories[category] || categories[category].length === 0) return;
        
        // Category header with toggle
        const header = document.createElement('div');
        header.className = 'section-category-header';
        header.innerHTML = `
            <span>${category}</span>
            <span class="category-toggle" onclick="toggleCategory('${category}')" title="Toggle all in category">⊟</span>
        `;
        container.appendChild(header);
        
        // Section checkboxes
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
            
            if (section.originallyCommented) {
                label.classList.add('originally-commented');
                label.title = 'Commented out in original config';
            }
            
            div.appendChild(checkbox);
            div.appendChild(label);
            container.appendChild(div);
        });
    });
    
    // Update section count
    updateSectionCount();
}

/**
 * Toggle all sections in a category
 */
function toggleCategory(category) {
    const items = document.querySelectorAll(`.section-item[data-category="${category}"] input[type="checkbox"]`);
    const allChecked = Array.from(items).every(cb => cb.checked);
    items.forEach(cb => cb.checked = !allChecked);
    updateSectionCount();
}

/**
 * Toggle all sections on/off
 */
function toggleAllSections(enabled) {
    const checkboxes = document.querySelectorAll('#sections-container input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = enabled);
    updateSectionCount();
}

/**
 * Update the section count display
 */
function updateSectionCount() {
    const total = document.querySelectorAll('#sections-container input[type="checkbox"]').length;
    const checked = document.querySelectorAll('#sections-container input[type="checkbox"]:checked').length;
    const countEl = document.getElementById('sectionCount');
    if (countEl) {
        countEl.textContent = `${checked}/${total} sections enabled`;
    }
}

// Add event listener for checkbox changes
document.addEventListener('change', (e) => {
    if (e.target.matches('#sections-container input[type="checkbox"]')) {
        updateSectionCount();
    }
});

/**
 * MAIN GENERATE FUNCTION
 * Builds the config based on selected sections
 */
/**
 * Generate the config with a MINIMAL MODIFICATION approach
 * Keeps the original file structure intact, only modifies specific values
 */
function generate() {
    const sections = window.currentConfigData.sections;
    const fileName = window.currentConfigData.fileName;
    const rawConfig = window.currentConfigData.raw;
    
    if (!sections || sections.length === 0) {
        alert('Please select a board or upload a config file first.');
        return;
    }
    
    // Get kinematics
    const kinematicsKey = document.getElementById('kinematicsSelect').value;
    const kinematics = KINEMATICS[kinematicsKey];
    
    // Get all settings
    const settings = {
        kinematics: kinematicsKey,
        kinematicsKlipper: kinematics.klipperName,
        usesDelta: kinematics.usesDelta,
        // Bed dimensions (cartesian)
        bedX: parseInt(document.getElementById('bedX').value) || 235,
        bedY: parseInt(document.getElementById('bedY').value) || 235,
        bedZ: parseInt(document.getElementById('bedZ').value) || 250,
        // Delta dimensions
        deltaRadius: parseInt(document.getElementById('deltaRadius').value) || 140,
        deltaHeight: parseInt(document.getElementById('deltaHeight').value) || 300,
        deltaArmLength: parseInt(document.getElementById('deltaArmLength').value) || 270,
        // Z Motors
        zMotorCount: parseInt(document.getElementById('zMotorCount').value) || 1,
        zLevelingType: document.getElementById('zMotorCount').value === '4' 
            ? document.getElementById('quadLevelingType').value 
            : document.getElementById('zLevelingType')?.value || 'none',
        // Endstops
        endstopX: document.getElementById('endstopX').value,
        endstopY: document.getElementById('endstopY').value,
        zEndstopType: document.getElementById('zEndstopType').value,
        probeOffsetX: parseInt(document.getElementById('probeOffsetX').value) || -40,
        probeOffsetY: parseInt(document.getElementById('probeOffsetY').value) || -10,
        sensorlessXY: document.getElementById('sensorlessXY').checked
    };
    
    // Get selected section indices
    const selectedIndices = Array.from(
        document.querySelectorAll('#sections-container input[type="checkbox"]:checked')
    ).map(cb => parseInt(cb.value));
    
    // Split original file into lines for processing
    let lines = rawConfig.split('\n');
    
    // Find SAVE_CONFIG start
    const saveConfigStart = lines.findIndex(line => 
        line.includes('#*# <---------------------- SAVE_CONFIG ---------------------->')
    );
    
    // Process the file line by line
    let output = '';
    let currentSectionIndex = -1;
    let inSaveConfig = false;
    let i = 0;
    
    while (i < lines.length) {
        const line = lines[i];
        
        // Check if we've reached SAVE_CONFIG
        if (saveConfigStart !== -1 && i >= saveConfigStart) {
            inSaveConfig = true;
        }
        
        // If in SAVE_CONFIG, just output as-is
        if (inSaveConfig) {
            output += line + '\n';
            i++;
            continue;
        }
        
        // Check if this line starts a new section
        const sectionMatch = line.match(/^(\s*#\s*)?\[([^\]]+)\]/);
        if (sectionMatch) {
            // Find which section this is
            currentSectionIndex = sections.findIndex((s, idx) => 
                s.startLine === i
            );
        }
        
        // Determine if current section is selected
        const isCurrentSectionSelected = currentSectionIndex !== -1 && 
                                        selectedIndices.includes(currentSectionIndex);
        
        // Process the line based on section selection
        if (currentSectionIndex === -1) {
            // Before any section or between sections - keep as-is
            output += line + '\n';
            i++;
        } else {
            const section = sections[currentSectionIndex];
            const wasCommented = section.originallyCommented;
            
            if (isCurrentSectionSelected) {
                // Section is ENABLED
                let processedLine = line;
                
                // Uncomment if it was originally commented
                if (wasCommented && line.trim().startsWith('#')) {
                    processedLine = line.replace(/^(\s*)#\s?/, '$1');
                }
                
                // Apply modifications to specific values
                const result = applyLineModifications(processedLine, section.name, settings, 
                                                     window.currentConfigData.savedValues, lines, i);
                
                // Check if we need to skip the next line (when line was replaced)
                if (result.skipNext) {
                    output += result.line + '\n';
                    i += 2; // Skip current and next line
                } else {
                    output += result.line + '\n';
                    i++;
                }
            } else {
                // Section is DISABLED
                let processedLine = line;
                
                // Comment out if it wasn't originally commented
                if (!wasCommented && !line.trim().startsWith('#') && line.trim() !== '') {
                    processedLine = '#' + line;
                }
                
                output += processedLine + '\n';
                i++;
            }
        }
    }
    
    // Add generated Z motor sections if needed (after original config, before SAVE_CONFIG)
    if (!settings.usesDelta && settings.zMotorCount > 1 && saveConfigStart !== -1) {
        let additionalSections = generateAdditionalZMotors(settings, sections);
        
        // Insert before SAVE_CONFIG
        const beforeSaveConfig = output.substring(0, output.indexOf('#*# <---------------------- SAVE_CONFIG'));
        const saveConfigBlock = output.substring(output.indexOf('#*# <---------------------- SAVE_CONFIG'));
        
        output = beforeSaveConfig + '\n' + additionalSections + '\n' + saveConfigBlock;
    } else if (!settings.usesDelta && settings.zMotorCount > 1) {
        // No SAVE_CONFIG block, append at end
        output += '\n' + generateAdditionalZMotors(settings, sections);
    }
    
    document.getElementById('output').value = output;
}

/**
 * Apply modifications to a single line based on section context
 * Returns {line: string, skipNext: boolean} to handle multi-line replacements
 */
function applyLineModifications(line, sectionName, settings, savedValues, allLines, currentIndex) {
    const name = sectionName.toLowerCase();
    const trimmedLine = line.trim();
    
    // Check if this line should be commented due to SAVE_CONFIG override
    if (savedValues) {
        const keyMatch = trimmedLine.match(/^\s*([a-z_]+)\s*[:=]/);
        if (keyMatch && !trimmedLine.startsWith('#')) {
            const key = `${name}.${keyMatch[1]}`;
            if (savedValues[key] !== undefined) {
                return {line: '#' + line + '  # (overridden in SAVE_CONFIG)', skipNext: false};
            }
        }
    }
    
    // Apply modifications based on section and line content
    let modified = line;
    let skipNext = false;
    
    // Kinematics modifications
    if (name === 'printer' && trimmedLine.startsWith('kinematics:')) {
        modified = line.replace(/kinematics:\s*\w+/, `kinematics: ${settings.kinematicsKlipper}`);
    }
    
    // Sensorless homing modifications
    if (name === 'stepper_x' || name === 'stepper_y') {
        const isStepper = name === 'stepper_x' || name === 'stepper_y';
        
        if (settings.sensorlessXY && isStepper) {
            // ENABLE sensorless homing
            
            // If this is a physical endstop_pin line, comment it and add virtual on next line
            if (trimmedLine.match(/^endstop_pin:/) && !trimmedLine.includes('virtual_endstop')) {
                const axis = name === 'stepper_x' ? 'x' : 'y';
                modified = `#${line}  # Physical endstop (disabled for sensorless)\nendstop_pin: tmc2209_${name}:virtual_endstop`;
            }
            
            // If this is already a commented physical endstop, keep it commented
            if (trimmedLine.match(/^#.*endstop_pin:/) && !trimmedLine.includes('virtual_endstop')) {
                // Check if next line is the virtual endstop - if not, add it
                if (currentIndex + 1 < allLines.length) {
                    const nextLine = allLines[currentIndex + 1].trim();
                    if (!nextLine.includes('virtual_endstop')) {
                        const axis = name === 'stepper_x' ? 'x' : 'y';
                        modified = line + '\nendstop_pin: tmc2209_${name}:virtual_endstop';
                    }
                }
            }
            
            // Add or modify homing_retract_dist to 0
            if (trimmedLine.match(/^homing_retract_dist:/)) {
                modified = line.replace(/homing_retract_dist:\s*[\d.]+/, 'homing_retract_dist: 0');
            }
            
        } else if (!settings.sensorlessXY && isStepper) {
            // DISABLE sensorless homing (restore physical endstop)
            
            // If this is a commented physical endstop, uncomment it
            // Match any pin name format: ^PC0, !PA7, gpio15, ^!PB3, etc.
            // Basically anything that's NOT virtual_endstop or probe:
            if (trimmedLine.match(/^#\s*endstop_pin:/) && 
                !trimmedLine.includes('virtual_endstop') && 
                !trimmedLine.includes('probe:')) {
                // Uncomment the physical endstop pin
                modified = line.replace(/^(\s*)#\s*/, '$1');
                
                // Check if next line has the virtual endstop - if so, comment it out
                if (currentIndex + 1 < allLines.length) {
                    const nextLine = allLines[currentIndex + 1];
                    if (nextLine.includes('virtual_endstop')) {
                        // We'll comment out the virtual endstop on the next line
                        // But we can't modify it from here, so we mark the virtual line for commenting
                    }
                }
            }
            
            // If line has virtual_endstop, comment it out
            if (trimmedLine.match(/^endstop_pin:.*virtual_endstop/)) {
                // Check if previous line has a commented physical endstop
                if (currentIndex > 0) {
                    const prevLine = allLines[currentIndex - 1];
                    // Check if previous line is now an uncommented physical endstop
                    if (prevLine.trim().match(/^endstop_pin:/) && 
                        !prevLine.includes('virtual_endstop') &&
                        !prevLine.includes('#')) {
                        // Previous line was the uncommented physical endstop, skip this virtual line
                        skipNext = true;
                        modified = '';  // Don't output this line
                    } else {
                        modified = `#${line}  # Sensorless disabled - configure physical endstop_pin`;
                    }
                } else {
                    modified = `#${line}  # Sensorless disabled - configure physical endstop_pin`;
                }
            }
            
            // Restore normal homing_retract_dist if it was set to 0
            if (trimmedLine.match(/^homing_retract_dist:\s*0/)) {
                modified = line.replace(/homing_retract_dist:\s*0/, 'homing_retract_dist: 5');
            }
        }
    }
    
    // TMC driver modifications for sensorless
    if (name.startsWith('tmc2209 stepper_x') || name.startsWith('tmc2209 stepper_y')) {
        if (settings.sensorlessXY) {
            // Enable diag_pin and driver_SGTHRS
            if (trimmedLine.match(/^#.*diag_pin:/)) {
                // Uncomment diag_pin
                modified = line.replace(/^(\s*)#\s*/, '$1');
            }
            if (trimmedLine.match(/^#.*driver_SGTHRS:/)) {
                // Uncomment driver_SGTHRS
                modified = line.replace(/^(\s*)#\s*/, '$1');
            }
        } else {
            // Disable sensorless - comment out diag_pin and driver_SGTHRS
            if (trimmedLine.match(/^diag_pin:/) && !trimmedLine.startsWith('#')) {
                modified = '#' + line + '  # (sensorless homing disabled)';
            }
            if (trimmedLine.match(/^driver_SGTHRS:/) && !trimmedLine.startsWith('#')) {
                modified = '#' + line + '  # (sensorless homing disabled)';
            }
        }
    }
    
    // Bed dimension modifications for cartesian
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
    
    // Delta dimension modifications
    if (settings.usesDelta) {
        if ((name === 'stepper_a' || name === 'stepper_b' || name === 'stepper_c') && trimmedLine.match(/^position_max:/)) {
            modified = line.replace(/position_max:\s*[\d.]+/, `position_max: ${settings.deltaHeight}`);
        }
        if ((name === 'stepper_a' || name === 'stepper_b' || name === 'stepper_c') && trimmedLine.match(/^position_endstop:/)) {
            modified = line.replace(/position_endstop:\s*[\d.]+/, `position_endstop: ${settings.deltaHeight}`);
        }
    }
    
    // Probe offset modifications
    if ((name === 'probe' || name === 'bltouch') && trimmedLine.match(/^x_offset:/)) {
        modified = line.replace(/x_offset:\s*[-\d.]+/, `x_offset: ${settings.probeOffsetX}`);
    }
    if ((name === 'probe' || name === 'bltouch') && trimmedLine.match(/^y_offset:/)) {
        modified = line.replace(/y_offset:\s*[-\d.]+/, `y_offset: ${settings.probeOffsetY}`);
    }
    
    return {line: modified, skipNext: skipNext};
}

/**
 * Generate additional Z motor sections
 */
function generateAdditionalZMotors(settings, sections) {
    if (settings.zMotorCount <= 1) return '';
    
    const separator = '#=====================================#\n';
    let cfg = '';
    
    cfg += `${separator}`;
    cfg += `# ADDITIONAL Z MOTORS (Generated by Config Tool)\n`;
    cfg += `${separator}\n\n`;
    
    // Find the original stepper_z to get rotation_distance
    const stepperZ = sections.find(s => s.name.toLowerCase() === 'stepper_z');
    const stepperZContent = stepperZ ? stepperZ.content : '';
    
    // Try to extract rotation_distance from stepper_z
    const rotDistMatch = stepperZContent.match(/rotation_distance:\s*([\d.]+)/);
    const rotationDistance = rotDistMatch ? rotDistMatch[1] : '8';
    
    // Try to extract microsteps from stepper_z
    const microMatch = stepperZContent.match(/microsteps:\s*(\d+)/);
    const microsteps = microMatch ? microMatch[1] : '16';
    
    for (let i = 1; i < settings.zMotorCount; i++) {
        cfg += `[stepper_z${i}]\n`;
        cfg += `# Copy pins from your board's available stepper driver\n`;
        cfg += `# Typically: E1, E2, E3, or additional driver headers\n`;
        cfg += `step_pin: CHANGE_ME  # Example: PB3 for E1 on many boards\n`;
        cfg += `dir_pin: CHANGE_ME   # Example: PB4 for E1 on many boards\n`;
        cfg += `enable_pin: !CHANGE_ME  # Example: !PD2 for E1 on many boards\n`;
        cfg += `microsteps: ${microsteps}\n`;
        cfg += `rotation_distance: ${rotationDistance}  # Must match stepper_z\n`;
        cfg += `# IMPORTANT: Do NOT define endstop_pin for additional Z steppers\n`;
        cfg += `# Only stepper_z should have an endstop\n\n`;
    }
    
    // Check if there are TMC sections for stepper_z and add matching ones for additional Z
    const tmcZ = sections.find(s => {
        const name = s.name.toLowerCase();
        return name.includes('tmc') && name.includes('stepper_z') && !name.includes('stepper_z1');
    });
    
    if (tmcZ) {
        const tmcType = tmcZ.name.split(' ')[0]; // Get TMC type (e.g., tmc2209, tmc2130)
        const tmcContent = tmcZ.content;
        
        // Extract run_current from original TMC section
        const currentMatch = tmcContent.match(/run_current:\s*([\d.]+)/);
        const runCurrent = currentMatch ? currentMatch[1] : '0.580';
        
        for (let i = 1; i < settings.zMotorCount; i++) {
            cfg += `[${tmcType} stepper_z${i}]\n`;
            cfg += `uart_pin: CHANGE_ME  # UART pin for this driver\n`;
            cfg += `run_current: ${runCurrent}  # Match stepper_z current\n`;
            cfg += `stealthchop_threshold: 999999\n\n`;
        }
    }
    
    // Add z_tilt or quad_gantry_level section
    if (settings.zLevelingType === 'z_tilt') {
        cfg += `[z_tilt]\n`;
        cfg += `# ADJUST THESE VALUES TO MATCH YOUR PRINTER!\n`;
        cfg += `# z_positions: Physical locations of the Z motors\n`;
        cfg += `# points: Probe points (must be reachable by probe)\n\n`;
        if (settings.zMotorCount === 2) {
            cfg += `# Example for 2 Z motors (left/right configuration)\n`;
            cfg += `z_positions:\n`;
            cfg += `    -50, ${Math.round(settings.bedY / 2)}      # Left Z motor (behind bed edge)\n`;
            cfg += `    ${settings.bedX + 50}, ${Math.round(settings.bedY / 2)}  # Right Z motor (behind bed edge)\n`;
            cfg += `points:\n`;
            cfg += `    30, ${Math.round(settings.bedY / 2)}     # Left probe point\n`;
            cfg += `    ${settings.bedX - 30}, ${Math.round(settings.bedY / 2)}  # Right probe point\n`;
        } else if (settings.zMotorCount === 3) {
            cfg += `# Example for 3 Z motors (triangle configuration)\n`;
            cfg += `z_positions:\n`;
            cfg += `    ${Math.round(settings.bedX / 2)}, -50                    # Front center motor\n`;
            cfg += `    -50, ${settings.bedY + 50}  # Rear left motor\n`;
            cfg += `    ${settings.bedX + 50}, ${settings.bedY + 50}     # Rear right motor\n`;
            cfg += `points:\n`;
            cfg += `    ${Math.round(settings.bedX / 2)}, 30    # Front center probe point\n`;
            cfg += `    30, ${settings.bedY - 30}               # Rear left probe point\n`;
            cfg += `    ${settings.bedX - 30}, ${settings.bedY - 30}  # Rear right probe point\n`;
        } else {
            cfg += `# Example for 4 Z motors (quad configuration)\n`;
            cfg += `z_positions:\n`;
            cfg += `    -50, -50          # Front left motor\n`;
            cfg += `    -50, ${settings.bedY + 50}      # Rear left motor\n`;
            cfg += `    ${settings.bedX + 50}, ${settings.bedY + 50}  # Rear right motor\n`;
            cfg += `    ${settings.bedX + 50}, -50  # Front right motor\n`;
            cfg += `points:\n`;
            cfg += `    30, 30\n`;
            cfg += `    30, ${settings.bedY - 30}\n`;
            cfg += `    ${settings.bedX - 30}, ${settings.bedY - 30}\n`;
            cfg += `    ${settings.bedX - 30}, 30\n`;
        }
        cfg += `speed: 150\n`;
        cfg += `horizontal_move_z: 5  # Height to lift Z before moving between points\n`;
        cfg += `retries: 5            # Number of times to retry if adjustment fails\n`;
        cfg += `retry_tolerance: 0.0075  # Maximum allowed error (mm)\n\n`;
    } else if (settings.zLevelingType === 'quad_gantry_level') {
        cfg += `[quad_gantry_level]\n`;
        cfg += `# ADJUST THESE VALUES TO MATCH YOUR PRINTER!\n`;
        cfg += `# gantry_corners: Physical locations where the gantry is attached to Z motors\n`;
        cfg += `#   These are typically OUTSIDE the bed area\n`;
        cfg += `# points: Probe points (must be reachable by probe and INSIDE bed area)\n\n`;
        cfg += `gantry_corners:\n`;
        cfg += `    -60, -10              # Front left gantry attachment point\n`;
        cfg += `    ${settings.bedX + 60}, ${settings.bedY + 60}  # Rear right gantry attachment point\n`;
        cfg += `points:\n`;
        cfg += `    30, 30                # Front left probe point\n`;
        cfg += `    30, ${settings.bedY - 30}               # Rear left probe point\n`;
        cfg += `    ${settings.bedX - 30}, ${settings.bedY - 30}  # Rear right probe point\n`;
        cfg += `    ${settings.bedX - 30}, 30               # Front right probe point\n`;
        cfg += `speed: 150\n`;
        cfg += `horizontal_move_z: 5  # Height to lift Z before moving between points\n`;
        cfg += `retries: 5            # Number of times to retry if adjustment fails\n`;
        cfg += `retry_tolerance: 0.0075  # Maximum allowed error (mm)\n`;
        cfg += `max_adjust: 10        # Maximum adjustment allowed (mm)\n\n`;
    }
    
    return cfg;
}
        
/**
 * Comment out lines in section content that have corresponding saved values
 * This prevents conflicts when Klipper loads the config
 */
function commentOutSavedLines(content, sectionName, savedValues) {
    if (!savedValues || Object.keys(savedValues).length === 0) {
        return content;
    }
    
    const lines = content.split('\n');
    const normalizedSection = sectionName.toLowerCase();
    
    const modifiedLines = lines.map(line => {
        // Skip lines that are already comments or section headers
        if (line.trim().startsWith('#') || line.trim().startsWith('[')) {
            return line;
        }
        
        // Check if this line has a key that exists in saved values
        const match = line.match(/^\s*([a-z_]+)\s*[:=]/);
        if (match) {
            const key = `${normalizedSection}.${match[1]}`;
            if (savedValues[key] !== undefined) {
                // Comment out this line with a note
                return `#${line}  # (overridden in SAVE_CONFIG)`;
            }
        }
        
        return line;
    });
    
    return modifiedLines.join('\n');
}

/**
 * Uncomment a section (remove leading # from all lines)
 */
function uncommentSection(content) {
    return content.split('\n').map(line => {
        // Remove leading # and optional space
        return line.replace(/^#\s?/, '');
    }).join('\n');
}

/**
 * Comment out a section (add # to all lines)
 */
function commentSection(content) {
    return content.split('\n').map(line => {
        // Don't double-comment
        if (line.trim().startsWith('#') || line.trim() === '') {
            return line;
        }
        return '#' + line;
    }).join('\n');
}

/**
 * Apply kinematics settings to [printer] section
 */
function applyKinematics(content, sectionName, settings) {
    const name = sectionName.toLowerCase();
    
    if (name !== 'printer') return content;
    
    const { kinematicsKlipper, usesDelta, deltaRadius, deltaHeight, deltaArmLength, bedZ } = settings;
    
    // Update kinematics type
    content = content.replace(/kinematics:\s*\w+/, `kinematics: ${kinematicsKlipper}`);
    
    // For delta printers, add/update delta-specific settings
    if (usesDelta && kinematicsKlipper === 'delta') {
        // Update or add delta_radius
        if (content.includes('delta_radius')) {
            content = content.replace(/delta_radius:\s*[\d.]+/, `delta_radius: ${deltaRadius}`);
        } else {
            content = content.replace(/(kinematics:.*)/, `$1\ndelta_radius: ${deltaRadius}`);
        }
        
        // Add print_radius if not present
        if (!content.includes('print_radius')) {
            content = content.replace(/(delta_radius:.*)/, `$1\nprint_radius: ${deltaRadius}`);
        } else {
            content = content.replace(/print_radius:\s*[\d.]+/, `print_radius: ${deltaRadius}`);
        }
        
        // Add/update arm_length
        if (!content.includes('arm_length')) {
            content = content.replace(/(print_radius:.*)/, `$1\narm_length: ${deltaArmLength}`);
        } else {
            content = content.replace(/arm_length:\s*[\d.]+/, `arm_length: ${deltaArmLength}`);
        }
        
        // Add minimum_z_position for delta
        if (!content.includes('minimum_z_position')) {
            content = content.replace(/(arm_length:.*)/, `$1\nminimum_z_position: -5`);
        }
        
        // For delta, adjust max_z_velocity
        content = content.replace(/max_z_velocity:\s*[\d.]+/, `max_z_velocity: 50`);
    }
    
    return content;
}

/**
 * Apply bed dimension overrides to stepper sections
 */
function applyBedDimensions(content, sectionName, settings) {
    const name = sectionName.toLowerCase();
    const { bedX, bedY, bedZ, endstopX, endstopY, usesDelta, deltaRadius, deltaHeight } = settings;
    
    // For delta printers, handle stepper_a, stepper_b, stepper_c (towers)
    if (usesDelta) {
        if (name === 'stepper_a' || name === 'stepper_b' || name === 'stepper_c') {
            // Delta towers typically home to max
            content = content.replace(/position_max:\s*[\d.]+/, `position_max: ${deltaHeight}`);
            content = content.replace(/position_endstop:\s*[\d.]+/, `position_endstop: ${deltaHeight}`);
            // Ensure homing to max
            if (!content.includes('homing_positive_dir')) {
                content = content.replace(/(homing_speed:.*)/, '$1\nhoming_positive_dir: true');
            }
        } else if (name === 'stepper_z') {
            // Some delta configs use stepper_z for the first tower
            content = content.replace(/position_max:\s*[\d.]+/, `position_max: ${deltaHeight}`);
        }
        return content;
    }
    
    // Cartesian/CoreXY handling
    if (name === 'stepper_x') {
        content = content.replace(/position_max:\s*[\d.]+/, `position_max: ${bedX}`);
        // Handle position_endstop based on endstop position
        if (endstopX === 'max') {
            content = content.replace(/position_endstop:\s*[\d.]+/, `position_endstop: ${bedX}`);
        } else {
            content = content.replace(/position_endstop:\s*[\d.]+/, `position_endstop: 0`);
        }
    } else if (name === 'stepper_y') {
        content = content.replace(/position_max:\s*[\d.]+/, `position_max: ${bedY}`);
        if (endstopY === 'max') {
            content = content.replace(/position_endstop:\s*[\d.]+/, `position_endstop: ${bedY}`);
        } else {
            content = content.replace(/position_endstop:\s*[\d.]+/, `position_endstop: 0`);
        }
    } else if (name === 'stepper_z') {
        content = content.replace(/position_max:\s*[\d.]+/, `position_max: ${bedZ}`);
    } else if (name === 'safe_z_home') {
        // Center the safe z home position
        const centerX = Math.round(bedX / 2);
        const centerY = Math.round(bedY / 2);
        content = content.replace(/home_xy_position:\s*[\d.]+\s*,\s*[\d.]+/, `home_xy_position: ${centerX}, ${centerY}`);
    } else if (name === 'bed_mesh') {
        // Update bed mesh bounds
        content = content.replace(/mesh_max:\s*[\d.]+\s*,\s*[\d.]+/, `mesh_max: ${bedX - 10}, ${bedY - 10}`);
    }
    
    return content;
}

/**
 * Apply endstop settings (position and homing direction)
 * Preserves original pins as comments for reference
 */
function applyEndstopSettings(content, sectionName, settings) {
    const name = sectionName.toLowerCase();
    const { endstopX, endstopY, zEndstopType, bedZ } = settings;
    
    // Handle X stepper endstop
    if (name === 'stepper_x') {
        if (endstopX === 'max') {
            // Homing to max position
            content = content.replace(/homing_positive_dir:\s*(true|false)/i, 'homing_positive_dir: true');
            if (!content.includes('homing_positive_dir')) {
                content = content.replace(/(homing_speed:.*)/, '$1\nhoming_positive_dir: true');
            }
        } else {
            // Homing to min (default) - remove homing_positive_dir if present
            content = content.replace(/\nhoming_positive_dir:.*$/m, '');
        }
    }
    
    // Handle Y stepper endstop  
    if (name === 'stepper_y') {
        if (endstopY === 'max') {
            content = content.replace(/homing_positive_dir:\s*(true|false)/i, 'homing_positive_dir: true');
            if (!content.includes('homing_positive_dir')) {
                content = content.replace(/(homing_speed:.*)/, '$1\nhoming_positive_dir: true');
            }
        } else {
            content = content.replace(/\nhoming_positive_dir:.*$/m, '');
        }
    }
    
    // Handle Z stepper endstop
    if (name === 'stepper_z') {
        if (zEndstopType === 'probe') {
            // Use probe as endstop, keep original pin as comment
            content = content.replace(
                /endstop_pin:\s*(\^?[A-Z0-9_]+)/i, 
                'endstop_pin: probe:z_virtual_endstop  #$1'
            );
            // Comment out position_endstop but keep the value
            content = content.replace(/^(position_endstop:.*)$/m, '#$1');
            // Add position_min for probing below 0
            if (!content.includes('position_min')) {
                content = content.replace(/(position_max:.*)/, '$1\nposition_min: -5');
            }
        } else if (zEndstopType === 'switch_max') {
            // Endstop at top
            content = content.replace(/position_endstop:\s*[\d.]+/, `position_endstop: ${bedZ}`);
            content = content.replace(/homing_positive_dir:\s*(true|false)/i, 'homing_positive_dir: true');
            if (!content.includes('homing_positive_dir')) {
                content = content.replace(/(homing_speed:.*)/, '$1\nhoming_positive_dir: true');
            }
        } else {
            // switch_min - default, endstop at bottom
            content = content.replace(/position_endstop:\s*[\d.]+/, 'position_endstop: 0');
            content = content.replace(/\nhoming_positive_dir:.*$/m, '');
        }
    }
    
    return content;
}

/**
 * Apply sensorless homing configuration
 * Preserves original endstop pin as a comment for reference
 */
function applySensorlessHoming(content, sectionName, settings) {
    const name = sectionName.toLowerCase();
    const { sensorlessXY, endstopX, endstopY } = settings;
    
    if (!sensorlessXY) return content;
    
    // Apply to stepper_x
    if (name === 'stepper_x') {
        // Change endstop pin to use TMC virtual endstop, keep original as comment
        content = content.replace(
            /endstop_pin:\s*(\^?[A-Z0-9_]+)/i, 
            'endstop_pin: tmc2209_stepper_x:virtual_endstop  #$1'
        );
        // Add homing_retract_dist: 0 for sensorless
        if (!content.includes('homing_retract_dist')) {
            content = content.replace(/(homing_speed:.*)/, '$1\nhoming_retract_dist: 0');
        } else {
            content = content.replace(/homing_retract_dist:\s*[\d.]+/, 'homing_retract_dist: 0');
        }
    }
    
    // Apply to stepper_y
    if (name === 'stepper_y') {
        content = content.replace(
            /endstop_pin:\s*(\^?[A-Z0-9_]+)/i, 
            'endstop_pin: tmc2209_stepper_y:virtual_endstop  #$1'
        );
        if (!content.includes('homing_retract_dist')) {
            content = content.replace(/(homing_speed:.*)/, '$1\nhoming_retract_dist: 0');
        } else {
            content = content.replace(/homing_retract_dist:\s*[\d.]+/, 'homing_retract_dist: 0');
        }
    }
    
    // Enable diag_pin in TMC sections
    if (name === 'tmc2209 stepper_x' || name === 'tmc2209 stepper_y') {
        // Uncomment diag_pin if it's commented
        content = content.replace(/^#+(diag_pin:.*)$/m, '$1');
        // Add driver_SGTHRS if not present (StallGuard threshold)
        if (!content.includes('driver_SGTHRS')) {
            content = content.replace(/(run_current:.*)/, '$1\ndriver_SGTHRS: 100  # Adjust 0-255, higher = more sensitive');
        }
    }
    
    return content;
}

/**
 * Apply probe settings (offsets, safe_z_home, etc.)
 */
function applyProbeSettings(content, sectionName, settings) {
    const name = sectionName.toLowerCase();
    const { zEndstopType, probeOffsetX, probeOffsetY, bedX, bedY } = settings;
    
    if (zEndstopType !== 'probe') return content;
    
    // Update BLTouch/probe offsets
    if (name === 'bltouch' || name === 'probe') {
        content = content.replace(/x_offset:\s*[-\d.]+/, `x_offset: ${probeOffsetX}`);
        content = content.replace(/y_offset:\s*[-\d.]+/, `y_offset: ${probeOffsetY}`);
    }
    
    // Update safe_z_home to account for probe offset
    if (name === 'safe_z_home') {
        // Calculate safe home position (probe must be over bed)
        let homeX = Math.round(bedX / 2);
        let homeY = Math.round(bedY / 2);
        
        // Adjust if probe offset would put it off the bed
        homeX = Math.max(Math.abs(probeOffsetX), Math.min(homeX, bedX - Math.abs(probeOffsetX)));
        homeY = Math.max(Math.abs(probeOffsetY), Math.min(homeY, bedY - Math.abs(probeOffsetY)));
        
        content = content.replace(/home_xy_position:\s*[\d.]+\s*,\s*[\d.]+/, `home_xy_position: ${homeX}, ${homeY}`);
    }
    
    return content;
}

/**
 * Show/hide probe offset inputs based on Z endstop type
 * Also automatically enable probe sections when probe is selected
 */
function updateZEndstopOptions() {
    const zType = document.getElementById('zEndstopType').value;
    const probeGroup = document.getElementById('probeOffsetGroup');
    
    if (zType === 'probe') {
        probeGroup.style.display = 'block';
        
        // Automatically enable probe-related sections
        const checkboxes = document.querySelectorAll('#sections-container input[type="checkbox"]');
        checkboxes.forEach(cb => {
            const sectionName = cb.dataset.sectionName.toLowerCase();
            // Enable probe, bltouch, safe_z_home, and bed_mesh sections
            if (sectionName === 'probe' || 
                sectionName === 'bltouch' || 
                sectionName === 'safe_z_home' ||
                sectionName === 'bed_mesh') {
                cb.checked = true;
            }
        });
        updateSectionCount();
    } else {
        probeGroup.style.display = 'none';
        
        // Optionally disable probe sections when switching away from probe
        // (commented out to avoid accidentally disabling sections user may want)
        /*
        const checkboxes = document.querySelectorAll('#sections-container input[type="checkbox"]');
        checkboxes.forEach(cb => {
            const sectionName = cb.dataset.sectionName.toLowerCase();
            if (sectionName === 'probe' || sectionName === 'bltouch') {
                cb.checked = false;
            }
        });
        updateSectionCount();
        */
    }
}

/**
 * Download the generated config
 */
function download() {
    const text = document.getElementById('output').value;
    if (!text) {
        alert('Please generate a config first.');
        return;
    }
    
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'printer.cfg';
    a.click();
    URL.revokeObjectURL(a.href);
}

/**
 * Board selection change handler
 */
document.addEventListener('DOMContentLoaded', () => {
    const boardSelect = document.getElementById('boardSelect');
    
    boardSelect.addEventListener('change', () => {
        const selected = boardSelect.value;
        if (selected && selected !== '__uploaded__' && !selected.includes('Error') && !selected.includes('Loading')) {
            // Hide uploaded file indicator
            const uploadedEl = document.getElementById('uploadedFileName');
            if (uploadedEl) uploadedEl.style.display = 'none';
            
            loadConfigFromRepo(selected);
        }
    });
});
