const REPO_OWNER = "Kanrog";
const REPO_NAME = "klipper-config-generator";
const CONFIG_FOLDER = "config-examples";

// Store the current config data globally
window.currentConfigData = {
    raw: '',
    sections: [],
    fileName: ''
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
    
    window.currentConfigData = {
        raw: configText,
        sections: sections,
        fileName: fileName
    };
    
    renderSectionCheckboxes(sections);
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
    
    for (let i = 0; i < lines.length; i++) {
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
    
    // Don't forget the last section
    if (currentSection) {
        currentSection.endLine = lines.length - 1;
        currentSection.content = extractSectionContent(lines, currentSection.startLine, currentSection.endLine);
        sections.push(currentSection);
    }
    
    return sections;
}

/**
 * Extract the raw content of a section (including the header)
 */
function extractSectionContent(lines, startLine, endLine) {
    // Trim trailing empty lines
    while (endLine > startLine && lines[endLine].trim() === '') {
        endLine--;
    }
    return lines.slice(startLine, endLine + 1).join('\n');
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
function generate() {
    const sections = window.currentConfigData.sections;
    const fileName = window.currentConfigData.fileName;
    
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
    
    // Build the config header
    let cfg = `# Klipper Config Generator\n`;
    cfg += `# Base config: ${fileName}\n`;
    cfg += `# Generated: ${new Date().toLocaleString()}\n`;
    cfg += `# Sections: ${selectedIndices.length} of ${sections.length} enabled\n`;
    cfg += `#\n`;
    cfg += `# Settings:\n`;
    cfg += `#   Kinematics: ${kinematics.name}\n`;
    if (settings.usesDelta) {
        cfg += `#   Print Radius: ${settings.deltaRadius}mm, Height: ${settings.deltaHeight}mm\n`;
    } else {
        cfg += `#   Bed: ${settings.bedX}x${settings.bedY}x${settings.bedZ}mm\n`;
    }
    if (kinematics.usesXYEndstops) {
        cfg += `#   X Endstop: ${settings.endstopX}, Y Endstop: ${settings.endstopY}\n`;
    }
    cfg += `#   Z Endstop: ${settings.zEndstopType}\n`;
    if (settings.sensorlessXY) {
        cfg += `#   Sensorless Homing: Enabled (X/Y)\n`;
    }
    cfg += `\n`;
    
    sections.forEach((section, index) => {
        const isSelected = selectedIndices.includes(index);
        let content = section.content;
        
        if (isSelected) {
            // UNCOMMENT the section if it was originally commented
            if (section.originallyCommented) {
                content = uncommentSection(content);
            }
            
            // Apply modifications based on section type
            content = applyKinematics(content, section.name, settings);
            content = applyBedDimensions(content, section.name, settings);
            content = applyEndstopSettings(content, section.name, settings);
            content = applySensorlessHoming(content, section.name, settings);
            content = applyProbeSettings(content, section.name, settings);
            
            cfg += content + '\n\n';
        } else {
            // COMMENT OUT the section if it was originally enabled
            if (!section.originallyCommented) {
                content = commentSection(content);
            }
            cfg += content + '\n\n';
        }
    });
    
    // Clean up excessive blank lines
    cfg = cfg.replace(/\n{3,}/g, '\n\n');
    
    document.getElementById('output').value = cfg;
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
    
    const { kinematicsKlipper, usesDelta, deltaRadius, deltaHeight, bedZ } = settings;
    
    // Update kinematics type
    content = content.replace(/kinematics:\s*\w+/, `kinematics: ${kinematicsKlipper}`);
    
    // For delta printers, add/update delta-specific settings
    if (usesDelta) {
        // Update or add delta_radius
        if (content.includes('delta_radius')) {
            content = content.replace(/delta_radius:\s*[\d.]+/, `delta_radius: ${deltaRadius}`);
        } else {
            content = content.replace(/(kinematics:.*)/, `$1\ndelta_radius: ${deltaRadius}`);
        }
        
        // For delta, max_z is the height
        content = content.replace(/max_z_velocity:\s*[\d.]+/, `max_z_velocity: 50`);
        
        // Add print_radius if not present
        if (!content.includes('print_radius') && kinematicsKlipper === 'delta') {
            content = content.replace(/(delta_radius:.*)/, `$1\nprint_radius: ${deltaRadius}`);
        }
        
        // Add minimum_z_position for delta
        if (!content.includes('minimum_z_position')) {
            content = content.replace(/(kinematics:.*)/, `$1\nminimum_z_position: -5`);
        }
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
            // Use probe as endstop
            content = content.replace(/endstop_pin:\s*\^?[A-Z0-9_]+/i, 'endstop_pin: probe:z_virtual_endstop');
            // Comment out position_endstop
            content = content.replace(/^(position_endstop:.*)$/m, '#$1  # Disabled - using probe');
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
 */
function applySensorlessHoming(content, sectionName, settings) {
    const name = sectionName.toLowerCase();
    const { sensorlessXY, endstopX, endstopY } = settings;
    
    if (!sensorlessXY) return content;
    
    // Apply to stepper_x
    if (name === 'stepper_x') {
        // Change endstop pin to use TMC virtual endstop
        content = content.replace(/endstop_pin:\s*\^?[A-Z0-9_]+/i, 'endstop_pin: tmc2209_stepper_x:virtual_endstop');
        // Add homing_retract_dist: 0 for sensorless
        if (!content.includes('homing_retract_dist')) {
            content = content.replace(/(homing_speed:.*)/, '$1\nhoming_retract_dist: 0');
        } else {
            content = content.replace(/homing_retract_dist:\s*[\d.]+/, 'homing_retract_dist: 0');
        }
    }
    
    // Apply to stepper_y
    if (name === 'stepper_y') {
        content = content.replace(/endstop_pin:\s*\^?[A-Z0-9_]+/i, 'endstop_pin: tmc2209_stepper_y:virtual_endstop');
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
 */
function updateZEndstopOptions() {
    const zType = document.getElementById('zEndstopType').value;
    const probeGroup = document.getElementById('probeOffsetGroup');
    
    if (zType === 'probe') {
        probeGroup.style.display = 'block';
    } else {
        probeGroup.style.display = 'none';
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
