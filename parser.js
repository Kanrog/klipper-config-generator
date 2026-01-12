// A simple function to turn a Klipper .cfg into a JS Object
function parseKlipperConfig(text) {
    const config = {};
    let currentSection = null;

    text.split('\n').forEach(line => {
        line = line.split('#')[0].split(';')[0].trim(); // Remove comments
        if (!line) return;

        const sectionMatch = line.match(/^\[(.*)\]$/);
        if (sectionMatch) {
            currentSection = sectionMatch[1];
            config[currentSection] = {};
        } else if (currentSection && line.includes(':')) {
            const [key, ...valParts] = line.split(':');
            config[currentSection][key.trim()] = valParts.join(':').trim();
        }
    });
    return config;
}