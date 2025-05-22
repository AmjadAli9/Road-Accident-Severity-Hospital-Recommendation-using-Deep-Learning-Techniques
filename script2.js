const algorithms = ["CNN", "SVM", "Decision Tree", "Random Forest"];
const accuracy = [0.95, 0.88, 0.83, 0.91]; 
const precision = [0.93, 0.86, 0.81, 0.89]; 
const recall = [0.92, 0.84, 0.80, 0.90];
const f1Score = [0.92, 0.85, 0.80, 0.89];

// Populate Table
const tableBody = document.getElementById('performanceTable');
algorithms.forEach((algo, index) => {
    let row = `<tr>
        <td>${algo}</td>
        <td>${(accuracy[index] * 100).toFixed(2)}%</td>
        <td>${(precision[index] * 100).toFixed(2)}%</td>
        <td>${(recall[index] * 100).toFixed(2)}%</td>
        <td>${(f1Score[index] * 100).toFixed(2)}%</td>
    </tr>`;
    tableBody.innerHTML += row;
});

// Chart.js Graph
const ctx = document.getElementById('performanceChart').getContext('2d');
new Chart(ctx, {
    type: 'bar',
    data: {
        labels: algorithms,
        datasets: [
            { label: 'Accuracy', data: accuracy, backgroundColor: '#38bdf8' },
            { label: 'Precision', data: precision, backgroundColor: '#f87171' },
            { label: 'Recall', data: recall, backgroundColor: '#facc15' },
            { label: 'F1-Score', data: f1Score, backgroundColor: '#4ade80' }
        ]
    },
    options: {
        responsive: true,
        scales: { y: { beginAtZero: true, max: 1 } }
    }
});
