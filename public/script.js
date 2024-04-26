async function searchHandle() {
    const input = document.getElementById('productHandle').value;
    const dropdown = document.getElementById('dropdown');
    if (!input) {
        dropdown.style.display = 'none';
        return;
    }

    try {
        // Fetch the handles from the server
        const response = await fetch('/api/handles');
        const handles = await response.json();

        // Filter handles based on input and display them in the dropdown
        const filteredHandles = handles.filter(h => 
            h.handle.toLowerCase().includes(input.toLowerCase())
        );

        dropdown.innerHTML = filteredHandles.map(h => 
            `<div onclick="selectHandle('${h.handle}')">${h.handle}</div>`
        ).join('');

        dropdown.style.display = 'block';
    } catch (error) {
        console.error('Error fetching handles:', error);
    }
}

function selectHandle(value) {
    document.getElementById('productHandle').value = value;
    document.getElementById('dropdown').style.display = 'none';
}
