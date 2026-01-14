# Klipper Config Generator

A simple web tool to help you create configuration files for [Klipper](https://www.klipper3d.org/) 3D printer firmware.

![Status](https://img.shields.io/badge/Status-Work%20in%20Progress-yellow)

---

## What is this?

Setting up Klipper for your 3D printer requires a `printer.cfg` file that tells the firmware about your hardware — things like which pins control your motors, heaters, fans, and sensors.

This tool helps you **generate that config file** by:

1. Starting from a base config for your motherboard
2. Letting you turn sections on or off with checkboxes
3. Adjusting basic settings like bed size
4. Giving you a ready-to-download `printer.cfg`

---

## How to Use

1. **Pick your motherboard** from the dropdown (or upload your own config file)
2. **Enter your bed dimensions** (X, Y, Z in mm)
3. **Check the sections you want** — unchecked sections will be commented out
4. **Click "Generate Config"** to preview
5. **Click "Download"** to save your `printer.cfg`

---

## Features

- ✅ Recognizes all sections in a config, even commented-out ones
- ✅ Toggle entire sections on/off with a checkbox
- ✅ Sections organized by type (Steppers, Fans, Probing, etc.)
- ✅ Search/filter motherboards
- ✅ Upload your own `.cfg` file as a starting point
- ✅ Automatic bed size adjustments
- ✅ BLTouch/Probe support option

---

## ⚠️ Important Notes

- **Always verify your pins** before powering on motors or heaters! Incorrect pins can damage your printer.
- This tool gives you a **starting point** — you'll likely need to fine-tune values like stepper currents, PID settings, and probe offsets.
- The example configs are pulled from official Klipper sources but may not cover every board.

---

## Want to Contribute?

This project is a work in progress! If you'd like to help out:

- **Add more board configs** to the `config-examples` folder
- **Report issues** or suggest features
- **Get in touch** at [kanrog.github.io](https://kanrog.github.io/)

---

## Files

```
├── index.html          # The web interface
├── app.js              # All the logic
└── config-examples/    # Motherboard config files
    ├── generic-bigtreetech-skr-mini-e3-v3.0.cfg
    ├── generic-bigtreetech-manta-m8p-v1.1.cfg
    └── ... more boards
```

---

## License

Free to use and modify. If you find it helpful, a star ⭐ on the repo is appreciated!
