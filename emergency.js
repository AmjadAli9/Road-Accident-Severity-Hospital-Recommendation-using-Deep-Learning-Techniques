class EmergencyCoordinator {
  constructor() {
    this.emsETA = null;
    this.statusUpdates = [];
    this.updateInterval = null;
  }
  
  startEmergency(location) {
    // Simulate EMS dispatch
    this.emsETA = Math.floor(Math.random() * 15) + 5; // 5-20 minutes
    this.updateStatus("EMS dispatched");
    
    // Start countdown
    this.updateInterval = setInterval(() => {
      this.emsETA -= 1;
      this.updateCountdown();
      
      if (this.emsETA <= 0) {
        clearInterval(this.updateInterval);
        this.updateStatus("EMS has arrived");
      }
    }, 60000); // Update every minute
  }
  
  updateStatus(message) {
    this.statusUpdates.push({
      time: new Date().toLocaleTimeString(),
      message
    });
    this.renderStatus();
  }
  
  renderStatus() {
    const statusElement = document.getElementById('emergencyStatus');
    statusElement.innerHTML = this.statusUpdates
      .map(update => `<p>[${update.time}] ${update.message}</p>`)
      .join('');
  }
  
  updateCountdown() {
    document.getElementById('emsCountdown').textContent = 
      `Estimated arrival: ${this.emsETA} minutes`;
  }
  
  getFirstAidInstructions(injuryType) {
    const instructions = {
      fracture: "1. Immobilize the area\n2. Apply cold compress\n3. Don't try to realign bones",
      bleeding: "1. Apply direct pressure\n2. Elevate the injury\n3. Use clean cloth as dressing",
      head: "1. Keep person still\n2. Monitor consciousness\n3. Don't remove any lodged objects"
    };
    
    return instructions[injuryType] || "1. Keep patient calm\n2. Monitor breathing\n3. Don't move unnecessarily";
  }
}

// Initialize in your emergency page
const emergency = new EmergencyCoordinator();