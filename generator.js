async function buildConfig() {
    const boardFile = document.getElementById('boardSelect').value;
    const bedX = document.getElementById('bedX').value;
    const output = document.getElementById('output');

    output.value = "Fetching board pins from GitHub...";

    try {
        // 1. Fetch the raw config from Klipper's GitHub
        const url = `https://raw.githubusercontent.com/Klipper3d/klipper/master/config/${boardFile}`;
        const response = await fetch(url);
        const rawConfig = await response.text();

        // 2. Simple Parser to find [board_pins] aliases
        // In a real app, you'd use a regex or a proper INI parser
        const boardPinsMatch = rawConfig.match(/\[board_pins\][\s\S]*?aliases:([\s\S]*?)(?=\n\[|$)/);
        const aliases = boardPinsMatch ? boardPinsMatch[1].trim() : "# No aliases found";

        // 3. Construct the printer.cfg
        const printerCfg = `
# Generated for ${boardFile}
[include mainsail.cfg]

[mcu]
serial: /dev/serial/by-id/usb-Klipper_REPLACE_ME

[printer]
kinematics: cartesian
max_velocity: 300
max_accel: 3000

[board_pins]
aliases:
    ${aliases}

[stepper_x]
step_pin: PB13  # Note: In a full version, we'd map these to the aliases
dir_pin: !PB12
enable_pin: !PB14
microsteps: 16
rotation_distance: 40
endstop_pin: ^PC0
position_endstop: 0
position_max: ${bedX}
homing_speed: 50

# ... rest of config ...
`;

        output.value = printerCfg.trim();
    } catch (err) {
        output.value = "Error: " + err.message;
    }
}