const REPO_OWNER = "Kanrog";
const REPO_NAME = "klipper-config-generator";
const CONFIG_FOLDER = "config-examples";

// 1. Fetch board list from your GitHub Repo
window.onload = async () => {
    const select = document.getElementById('boardSelect');
    try {
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${CONFIG_FOLDER}`);
        const files = await response.json();

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
            }
        });
    } catch (err) {
        select.innerHTML = '<option>Error loading repo files</option>';
        console.error(err);
    }
};

// 2. Main Logic: Scrape and Generate
async function generate() {
    const boardFile = document.getElementById('boardSelect').value;
    const x = document.getElementById('bedX').value;
    const y = document.getElementById('bedY').value;
    const z = document.getElementById('bedZ').value;
    const blt = document.getElementById('hasBLTouch').checked;

    try {
        const response = await fetch(`./${CONFIG_FOLDER}/${boardFile}`);
        const raw = await response.text();

        // The Scraper Function
        const getPin = (section, key, fallback = "PA0_FIXME") => {
            const regex = new RegExp(`\\[${section}\\][\\s\\S]*?${key}:\\s*(\\S+)`, 'i');
            const match = raw.match(regex);
            return match ? match[1] : fallback;
        };

        let cfg = `# Klipper Config | Generated for ${boardFile}\n`;
        cfg += `# Date: ${new Date().toLocaleDateString()}\n\n`;

        cfg += `[mcu]\nserial: /dev/serial/by-id/usb-Klipper_REPLACE_ME\n\n`;

        cfg += `[printer]\nkinematics: cartesian\nmax_velocity: 300\nmax_accel: 3000\nmax_z_velocity: 5\nmax_z_accel: 100\n\n`;

        // Pull Aliases if they exist
        const aliasMatch = raw.match(/\[board_pins\][\s\S]*?aliases:([\s\S]*?)(?=\n\[|$)/);
        if (aliasMatch) {
            cfg += `[board_pins]\naliases:\n    ${aliasMatch[1].trim()}\n\n`;
        }

        // Steppers X, Y, Z
        const axes = [
            { id: 'x', max: x, stop: 'endstop_pin' },
            { id: 'y', max: y, stop: 'endstop_pin' },
            { id: 'z', max: z, stop: 'endstop_pin' }
        ];

        axes.forEach(axis => {
            const s = `stepper_${axis.id}`;
            cfg += `[${s}]\n`;
            cfg += `step_pin: ${getPin(s, 'step_pin')}\n`;
            cfg += `dir_pin: ${getPin(s, 'dir_pin')}\n`;
            cfg += `enable_pin: ${getPin(s, 'enable_pin')}\n`;
            cfg += `microsteps: 16\nrotation_distance: 40\n`;

            if (axis.id === 'z' && blt) {
                cfg += `endstop_pin: probe:z_virtual_endstop\n`;
                cfg += `position_min: -2\n`;
            } else {
                cfg += `endstop_pin: ${getPin(s, axis.stop)}\n`;
                cfg += `position_endstop: 0\n`;
            }
            cfg += `position_max: ${axis.max}\nhoming_speed: 50\n\n`;
        });

        // Extruder
        cfg += `[extruder]\n`;
        cfg += `step_pin: ${getPin('extruder', 'step_pin')}\n`;
        cfg += `dir_pin: ${getPin('extruder', 'dir_pin')}\n`;
        cfg += `enable_pin: ${getPin('extruder', 'enable_pin')}\n`;
        cfg += `microsteps: 16\nrotation_distance: 33.500\nnozzle_diameter: 0.400\nfilament_diameter: 1.750\n`;
        cfg += `heater_pin: ${getPin('extruder', 'heater_pin')}\n`;
        cfg += `sensor_type: EPCOS 100K B57560G104F\n`;
        cfg += `sensor_pin: ${getPin('extruder', 'sensor_pin')}\n`;
        cfg += `control: pid\npid_Kp: 22.2\npid_Ki: 1.08\npid_Kd: 114\nmin_temp: 0\nmax_temp: 250\n\n`;

        // Bed
        cfg += `[heater_bed]\n`;
        cfg += `heater_pin: ${getPin('heater_bed', 'heater_pin')}\n`;
        cfg += `sensor_type: ATC Semitec 104GT-2\n`;
        cfg += `sensor_pin: ${getPin('heater_bed', 'sensor_pin')}\n`;
        cfg += `control: watermark\nmin_temp: 0\nmax_temp: 130\n\n`;

        // Fans
        cfg += `[fan]\npin: ${getPin('fan', 'pin')}\n\n`;
        cfg += `[mcu_fan]\npin: ${getPin('controller_fan', 'pin', 'PA0_FIXME')}\n\n`;

        // BLTouch Logic
        if (blt) {
            const s_pin = getPin('bltouch', 'sensor_pin', getPin('probe', 'pin', 'PC14'));
            const c_pin = getPin('bltouch', 'control_pin', 'PA1');
            cfg += `[bltouch]\nsensor_pin: ${s_pin}\ncontrol_pin: ${c_pin}\nx_offset: -40\ny_offset: -10\nz_offset: 0\n\n`;
            cfg += `[safe_z_home]\nhome_xy_position: ${x/2}, ${y/2}\nspeed: 50\nz_hop: 10\n\n`;
        }

        document.getElementById('output').value = cfg;

    } catch (error) {
        console.error(error);
        alert("Error generating config. Check if file exists in /config-examples/");
    }
}

// 3. Download function
function download() {
    const text = document.getElementById('output').value;
    if (!text) return alert("Please generate a config first.");
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "printer.cfg";
    a.click();
}
