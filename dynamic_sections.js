document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('sections-container');
    const defaultConfigUrl = './config-examples/example-cartesian.cfg';

    try {
        const response = await fetch(defaultConfigUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch the default config file: ${response.status} ${response.statusText}`);
        }
        const text = await response.text();
        const sections = text.match(/^\s*\[([^\]]+)\]/gm);

        if (sections) {
            container.innerHTML = ''; // Clear the container
            sections.forEach(section => {
                const sectionName = section.trim().replace('[', '').replace(']', '');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `section-${sectionName}`;
                checkbox.value = sectionName;
                checkbox.checked = true;

                const label = document.createElement('label');
                label.htmlFor = `section-${sectionName}`;
                label.textContent = sectionName;

                const div = document.createElement('div');
                div.appendChild(checkbox);
                div.appendChild(label);
                container.appendChild(div);
            });
        }
    } catch (error) {
        container.innerHTML = 'Error loading config sections.';
        console.error(error);
    }
});
