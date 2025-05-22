   // DOM Elements
   const fileInput = document.getElementById('fileInput');
   const previewContainer = document.getElementById('previewContainer');
   const resultDiv = document.getElementById('result');
   const severityText = document.getElementById('severity');
   const injuryTypeText = document.getElementById('injuryType');
   const treatmentStepsText = document.getElementById('treatmentSteps');
   const cameraContainer = document.getElementById('cameraContainer');
   const cameraPreview = document.getElementById('cameraPreview');
   const analyzeBtn = document.getElementById('analyzeBtn');
   const cropperModal = document.getElementById('cropperModal');
   const cropperContainer = document.getElementById('cropperContainer');
   const progressContainer = document.querySelector('.progress-container');
   const progressBar = document.querySelector('.progress-bar');
   const progressText = document.querySelector('.progress-text');

   // State Variables
   let mediaStream = null;
   let currentMedia = null;
   let cropper = null;
   let currentFacingMode = 'environment';
   let flashOn = false;
   let track = null;

   // Camera Functions
   async function openCamera() {
       try {
           resetUI();
           
           const constraints = {
               video: {
                   facingMode: currentFacingMode,
                   width: { ideal: 1280 },
                   height: { ideal: 720 }
               },
               audio: false
           };
           
           mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
           
           // Find the video track for flash control
           track = mediaStream.getVideoTracks()[0];
           
           cameraPreview.srcObject = mediaStream;
           cameraContainer.style.display = "block";
           analyzeBtn.disabled = true;
           
       } catch (err) {
           console.error("Camera error:", err);
           alert("Could not access camera. Please check permissions.");
       }
   }

   function closeCamera() {
       if (mediaStream) {
           mediaStream.getTracks().forEach(track => track.stop());
           mediaStream = null;
           track = null;
       }
       cameraContainer.style.display = "none";
       cameraPreview.srcObject = null;
       updateAnalyzeButton();
   }

   function switchCamera() {
       currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
       closeCamera();
       openCamera();
   }

   async function toggleFlash() {
       if (!track || !track.getCapabilities().torch) {
           alert("Flash not available on this device");
           return;
       }
       
       try {
           flashOn = !flashOn;
           await track.applyConstraints({
               advanced: [{ torch: flashOn }]
           });
           
           const flashBtn = document.querySelector('.flash-btn');
           flashBtn.textContent = flashOn ? '✨ Flash On' : '✨ Flash Off';
       } catch (err) {
           console.error("Flash error:", err);
       }
   }

   function capturePhoto() {
       const canvas = document.createElement('canvas');
       canvas.width = cameraPreview.videoWidth;
       canvas.height = cameraPreview.videoHeight;
       const ctx = canvas.getContext('2d');
       
       ctx.drawImage(cameraPreview, 0, 0, canvas.width, canvas.height);
       
       // Prepare for cropping
       previewContainer.innerHTML = "";
       const img = document.createElement('img');
       img.id = "imageToCrop";
       img.src = canvas.toDataURL('image/jpeg');
       previewContainer.appendChild(img);
       
       // Store the original image
       canvas.toBlob(blob => {
           currentMedia = new File([blob], 'captured-photo.jpg', { type: 'image/jpeg' });
       }, 'image/jpeg', 0.9);
       
       // Open cropper
       openCropper(img);
       closeCamera();
   }

   // Cropper Functions
   function openCropper(imageElement) {
       cropperModal.style.display = "flex";
       cropperContainer.innerHTML = "";
       
       const cropperImage = document.createElement('img');
       cropperImage.src = imageElement.src;
       cropperContainer.appendChild(cropperImage);
       
       cropper = new Cropper(cropperImage, {
           aspectRatio: 4 / 3,
           viewMode: 1,
           autoCropArea: 0.8,
           responsive: true,
           guides: true
       });
   }

   function cropImage() {
       if (!cropper) return;
       
       cropper.getCroppedCanvas().toBlob(blob => {
           // Update the preview
           const url = URL.createObjectURL(blob);
           previewContainer.innerHTML = `<img class="capturedPhoto" src="${url}">`;
           
           // Update the current media file
           currentMedia = new File([blob], 'cropped-photo.jpg', { type: 'image/jpeg' });
           
           // Clean up
           closeCropper();
           updateAnalyzeButton();
       }, 'image/jpeg', 0.9);
   }

   function cancelCrop() {
       previewContainer.innerHTML = "";
       currentMedia = null;
       closeCropper();
       updateAnalyzeButton();
   }

   function closeCropper() {
       if (cropper) {
           cropper.destroy();
           cropper = null;
       }
       cropperModal.style.display = "none";
   }

   // File Handling
   fileInput.addEventListener('change', function(event) {
       const file = event.target.files[0];
       if (file) {
           resetUI();
           currentMedia = file;
           
           const fileType = file.type.split('/')[0];
           const mediaElement = fileType === 'image' ? 
               document.createElement('img') : 
               document.createElement('video');
               
           mediaElement.src = URL.createObjectURL(file);
           mediaElement.classList.add(fileType === 'image' ? 'imagePreview' : 'videoPreview');
           
           if (fileType === 'video') {
               mediaElement.controls = true;
           }
           
           previewContainer.appendChild(mediaElement);
           updateAnalyzeButton();
       }
   });

   // Analysis Functions
   function analyzeSeverity() {
       if (!currentMedia) return;
       
       resetResult();
       showLoading(true);
       
       // Simulate progress (replace with actual progress events if using real API)
       simulateProgress();
       
    
       // 1. Upload to your API
       // 2. Handle progress events
       // 3. Process the response
       
       setTimeout(() => {
           showLoading(false);
           
           if (currentMedia.type.startsWith('image')) {
               const img = previewContainer.querySelector('img');
               const prediction = classifyInjury(img);
               displayResult(prediction);
           } 
           else if (currentMedia.type.startsWith('video')) {
               const video = previewContainer.querySelector('video');
               video.pause();
               const canvas = document.createElement('canvas');
               canvas.width = video.videoWidth;
               canvas.height = video.videoHeight;
               const ctx = canvas.getContext('2d');
               ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
               
               const prediction = classifyInjury(canvas);
               displayResult(prediction);
           }
       }, 3000);
   }

   function simulateProgress() {
       let progress = 0;
       const interval = setInterval(() => {
           progress += Math.random() * 10;
           if (progress >= 100) {
               progress = 100;
               clearInterval(interval);
           }
           updateProgress(progress);
       }, 200);
   }

   function updateProgress(percent) {
       progressBar.style.width = `${percent}%`;
       progressText.textContent = `Analyzing: ${Math.round(percent)}%`;
   }

   function showLoading(show) {
       if (show) {
           progressContainer.style.display = "block";
           analyzeBtn.disabled = true;
       } else {
           progressContainer.style.display = "none";
           updateAnalyzeButton();
       }
   }

   // Sample Cases (for demo)
   function openSampleCases() {
       resetUI();
       alert("In a full implementation, this would show sample accident cases to analyze");
       // You would implement this with actual sample images
   }

   // Helper Functions
   function classifyInjury(mediaElement) {
       // Simulated analysis - replace with actual AI model in production
       const injuryType = Math.random();
       let severity, injuryTypeDescription, treatmentSteps;

       if (injuryType < 0.25) {
           severity = 'Minor';
           injuryTypeDescription = 'Small Cut or Bruise';
           treatmentSteps = 'Clean the wound and apply a bandage. Monitor for signs of infection.';
       } else if (injuryType < 0.5) {
           severity = 'Moderate';
           injuryTypeDescription = 'Fracture or Larger Wound';
           treatmentSteps = 'Immobilize the area, apply cold compress, and seek medical attention.';
       } else if (injuryType < 0.75) {
           severity = 'Severe';
           injuryTypeDescription = 'Heavy Bleeding or Deep Wound';
           treatmentSteps = 'Apply direct pressure to stop bleeding. Call emergency services immediately.';
       } else {
           severity = 'Critical';
           injuryTypeDescription = 'Severe Trauma with Blood Loss';
           treatmentSteps = 'DO NOT move the patient. Call emergency services immediately! Apply pressure to bleeding wounds.';
       }

       return {
           severity: severity,
           injuryType: injuryTypeDescription,
           treatmentSteps: treatmentSteps
       };
   }

   function displayResult(prediction) {
       const { severity, injuryType, treatmentSteps } = prediction;

       severityText.innerHTML = `<strong>Severity:</strong> <span class="severity-${severity.toLowerCase()}">${severity}</span>`;
       injuryTypeText.innerHTML = `<strong>Injury Type:</strong> ${injuryType}`;
       treatmentStepsText.innerHTML = `<strong>Recommended Treatment:</strong> ${treatmentSteps}`;

       resultDiv.style.display = "block";
   }

   function resetUI() {
       previewContainer.innerHTML = "";
       resultDiv.style.display = "none";
       progressContainer.style.display = "none";
       closeCamera();
       closeCropper();
   }

   function resetResult() {
       severityText.textContent = "";
       injuryTypeText.textContent = "";
       treatmentStepsText.textContent = "";
       resultDiv.style.display = "none";
   }

   function updateAnalyzeButton() {
       analyzeBtn.disabled = !currentMedia;
   }

   // Navigation Functions
   function openHospitalPage() {
       window.location.href = "hospital.html";
   }

   function callEmergency() {
       window.location.href = "tel:108";
   }

   // Service Worker Registration
   if ('serviceWorker' in navigator) {
       window.addEventListener('load', () => {
           navigator.serviceWorker.register('/service-worker.js')
               .then(registration => {
                   console.log('ServiceWorker registered');
               })
               .catch(err => {
                   console.log('ServiceWorker registration failed:', err);
               });
       });
   }

   // PWA Installation Prompt
   let deferredPrompt;
   window.addEventListener('beforeinstallprompt', (e) => {
       e.preventDefault();
       deferredPrompt = e;
       
       // Show install button (you can implement this)
       console.log('PWA install prompt available');
   });

   window.addEventListener('appinstalled', () => {
       console.log('PWA installed');
   });