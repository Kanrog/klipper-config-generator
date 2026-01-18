![Fairline Logo](fairline_logo.png)

---

A web-based tool for generating Klipper 3D printer configuration files.

🌐 **[Access the tool here](https://kanrog.github.io/klipper-config-generator/)** | 📖 **[Documentation Wiki](https://github.com/Kanrog/klipper-config-generator/wiki)**

---

## WORK IN PROGRESS

**This tool is under active development and is NOT ready for general use.**

If you are new to Klipper or 3D printer firmware configuration, this tool is not yet suitable for you. Incorrect configuration can damage your printer or cause safety hazards. Please wait for a stable release or use the official Klipper documentation and example configs instead.

If you are an experienced user and want to help test or contribute, you are welcome to try it out and provide feedback.

---

## What is this?

Setting up Klipper for your 3D printer requires a `printer.cfg` file that tells the firmware about your hardware - things like which pins control your motors, heaters, fans, and sensors.

This tool helps you generate that config file by:

1. Starting from a base config for your motherboard or one of the common printers available in klippers repo
2. Letting you turn sections on or off with checkboxes
3. Adjusting settings like bed size, endstop positions, and homing options
4. Giving you a ready-to-download `printer.cfg`
5. Add aditional MCU's to expand your printers functionality

---

## What this is not

I'm not trying to make a magic tool that will create perfect klipper configs for all kinds of setup, that is just not a realistic goal.
With this tool, I want to help users create "base" configs for their setup to decrease the time needed for a functional printer.
The less time you spend finding the right line to enable/disable for your spesific usecase can be eliminated and you can focus on optimizing your printers functionality, not reading trough documentation or seaching online for an existing config that maches your usecase exactly.

This is meant as a tool to _simplify_ the klipper experience.

---

## Current Features

- Recognizes all sections in a config, including commented-out ones
- Toggle entire sections on/off with checkboxes
- Sections organized by type (Steppers, Fans, Probing, etc.)
- Search/filter motherboard list
- Upload your own `.cfg` file as a starting point
- Automatic bed size adjustments
- Endstop position configuration (min/max for each axis)
- Z probe support (BLTouch, inductive, etc.) with offset configuration
- Sensorless homing option for X/Y axes
- Multi-MCU option for adding toolhead boards, extra printer boards and host.

---

## Roadmap

Here are planned features and ideas for the future:

### Short Term
- [ ] More base configs for popular motherboards
- [x] Kinematics selection (Cartesian, CoreXY, Delta, etc.)
- [x] Multiple Z stepper support
- [ ] Extruder configuration (rotation distance calculator, pressure advance)
- [ ] Input shaper defaults
- [x] Keep saved settings in uploaded cfg
- [x] Add "default" values as notes
- [x] Feature to keep inportant notes in configs
- [x] add support for [include]

### Medium Term
- [ ] Printer profile presets (Ender 3, Voron, Prusa, etc.)
- [ ] MCU firmware compilation helper / instructions
- [ ] Macro library (start/end gcode, pause/resume, etc.)
- [ ] Validation warnings for incompatible settings
- [x] Integrated editor for manual changes before download 
- [ ] Fan output control

### Long Term
- [ ] Community config database - users can upload and share their working configs
- [ ] Searchable printer list with configs tagged by printer model and features
- [ ] Config diff/comparison tool
- [ ] Import from Marlin configs(?)

### Ideas / Maybe
- [ ] Visual pin mapping diagram
- [ ] Integration with CANbus toolhead configs
- [x] Multi-MCU support
- [ ] Built-in documentation links for each section

---

## Important Warnings

- **Always verify your pin assignments** before powering on motors or heaters. Incorrect pins can damage your printer or start a fire.
- This tool gives you a **starting point** - you will likely need to fine-tune values like stepper currents, PID settings, probe offsets, and rotation distances.
- The example configs are based on official Klipper sources but may not cover every board revision or configuration.
- **Test carefully.** Home each axis individually. Check motor directions. Verify endstops trigger correctly. Heat components slowly and monitor temperatures.

---

## Contributing

This project needs help. If you want to contribute:

- **Add board configs** to the `config-examples` folder
- **Test and report issues** - especially edge cases and unusual setups
- **Suggest features** or improvements
- **Share your working configs** for inclusion in future database

📖 See the **[Contributing Guide](https://github.com/Kanrog/klipper-config-generator/wiki/How-to-Contribute)** in the wiki for more details.

Get in touch: [kanrog.github.io](https://kanrog.github.io/)

---

## Files

```
klipper-config-generator/
├── index.html              # Web interface
├── app.js                  # Application logic
├── README.md               # This file
└── config-examples/        # Motherboard config files
    ├── generic-bigtreetech-skr-mini-e3-v3.0.cfg
    ├── generic-bigtreetech-manta-m8p-v1.1.cfg
    └── ...
```

---

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.
