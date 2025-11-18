// Import the DataMatrix generator
import { generateDatamatrixCode } from './datamatrix.js';

// Get DOM elements
const xmlFileInput = document.getElementById('xml-file');
const processBtn = document.getElementById('process-btn');
const loadingElement = document.getElementById('loading');
const statusMessage = document.getElementById('status-message');
const resultsSection = document.getElementById('results-section');
const dataStringsContainer = document.getElementById('data-strings-container');
const datamatrixContainer = document.getElementById('datamatrix-container');
const debugInfo = document.getElementById('debug-info');

// Event listener for the process button
processBtn.addEventListener('click', async function() {
    const file = xmlFileInput.files[0];
    
    if (!file) {
        showStatus('Please select an XML file', 'error');
        return;
    }
    
    try {
        // Show loading state
        loadingElement.style.display = 'block';
        processBtn.disabled = true;
        hideStatus();
        debugInfo.style.display = 'none';
        resultsSection.style.display = 'none';
        
        // Process the XML file
        const result = await processXmlFile(file);
        
        // Display results
        await displayResults(result);
        
        showStatus('XML file processed successfully!', 'success');
        
    } catch (error) {
        console.error('Error processing XML file:', error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        loadingElement.style.display = 'none';
        processBtn.disabled = false;
    }
});

function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
}

function hideStatus() {
    statusMessage.style.display = 'none';
}

function showDebugInfo(info) {
    debugInfo.textContent = info;
    debugInfo.style.display = 'block';
}

async function processXmlFile(file) {
    // Read file as text
    const xmlText = await readFileAsText(file);
    
    // Parse XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Check for XML parsing errors
    const parseError = xmlDoc.getElementsByTagName('parsererror')[0];
    if (parseError) {
        throw new Error('Invalid XML format: ' + parseError.textContent);
    }
    
    // Generate aggregated data
    return generateAggregatedData(xmlDoc);
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function generateAggregatedData(xmlDoc) {
    const aggregatedDataList = [];
    const ordinalNumbers = [];
    const betData = {};
    
    // Get root element
    const root = xmlDoc.documentElement;
    
    // Get all bet elements
    const betElements = xmlDoc.getElementsByTagName('bet');
    
    // Extract day of the week from LocalDrawDateTime
    const localDrawDateTime = root.getAttribute('LocalDrawDateTime');
    const drawDate = parseDate(localDrawDateTime);
    const dayOfWeek = drawDate.getDay(); // 0-6 (Sunday-Saturday)
    
    console.log(`Parsed date: ${localDrawDateTime}, Day of week: ${dayOfWeek}, Power: ${Math.pow(2, dayOfWeek)}`);
    
    for (let betElement of betElements) {
        const betType = betElement.getAttribute('BetType');
        const ordinalNumber = betElement.getAttribute('OrdinalNumber');
        
        ordinalNumbers.push(ordinalNumber);
        betData[ordinalNumber] = new XMLSerializer().serializeToString(betElement);
        
        if (betType === 'Regular') {
            const blockCount = betElement.getAttribute('BlockCount');
            
            // Generate first part
            const firstPart = "1;FDJ;PDJ;0,0000;141;";
            
            // Generate second part
            let secondPart = "";
            for (let i = 1; i <= parseInt(blockCount); i++) {
                const block = betElement.querySelector(`Block${i}`);
                if (block) {
                    let regularGuess = block.getAttribute('RegularGuess');
                    let additionalGuess = block.getAttribute('AdditionalGuess');
                    
                    // Add leading zeros and remove commas
                    regularGuess = regularGuess.split(',')
                        .map(guess => guess.padStart(2, '0'))
                        .join('');
                    additionalGuess = additionalGuess.padStart(2, '0');
                    
                    secondPart += `${regularGuess}C${additionalGuess}O0,`;
                }
            }
            
            // Remove trailing comma
            secondPart = secondPart.replace(/,$/, '');
            
            // Generate third part
            const thirdPart = `;0,0;${Math.pow(2, dayOfWeek)},1;1`;
            
            // Combine all parts
            const aggregatedData = firstPart + secondPart + thirdPart;
            aggregatedDataList.push(aggregatedData);
            
            console.log(`Generated data for ordinal ${ordinalNumber}: ${aggregatedData}`);
            
        } else if (betType === 'Systematic') {
            const guess = betElement.querySelector('guess');
            if (guess) {
                let systematicGuess = guess.getAttribute('SystematicGuess');
                let additionalGuess = guess.getAttribute('AdditionalGuess');
                
                // Add leading zeros and remove semicolons
                systematicGuess = systematicGuess.split(';')
                    .map(guess => guess.padStart(2, '0'))
                    .join('');
                additionalGuess = additionalGuess.padStart(2, '0');
                
                // Generate first part
                const firstPart = "1;FDJ;PDJ;0,0000;141;";
                
                // Generate second part
                const secondPart = `${systematicGuess}C${additionalGuess}O0`;
                
                // Generate third part
                const thirdPart = `;0,0;${Math.pow(2, dayOfWeek)},1;1`;
                
                // Combine all parts
                const aggregatedData = firstPart + secondPart + thirdPart;
                aggregatedDataList.push(aggregatedData);
                
                console.log(`Generated data for ordinal ${ordinalNumber}: ${aggregatedData}`);
            }
        }
    }
    
    return { aggregatedDataList, ordinalNumbers, betData };
}

function parseDate(dateString) {
    // Parse date from DD-MM-YYYY HH:MM format
    const [datePart, timePart] = dateString.split(' ');
    const [day, month, year] = datePart.split('-');
    return new Date(`${year}-${month}-${day}T${timePart}`);
}

async function displayResults(result) {
    const { aggregatedDataList, ordinalNumbers, betData } = result;
    
    // Display data strings
    dataStringsContainer.innerHTML = '';
    aggregatedDataList.forEach((dataString, index) => {
        const div = document.createElement('div');
        div.className = 'data-string-item';
        div.innerHTML = `<strong>Ordinal ${ordinalNumbers[index]}:</strong> ${dataString}`;
        dataStringsContainer.appendChild(div);
    });
    
    // Generate and display DataMatrix images
    datamatrixContainer.innerHTML = '';
    
    let successfulGenerations = 0;
    let errors = [];
    
    for (let i = 0; i < aggregatedDataList.length; i++) {
        const dataString = aggregatedDataList[i];
        const ordinal = ordinalNumbers[i];
        
        try {
            console.log(`Generating DataMatrix for ordinal ${ordinal} with data: ${dataString}`);
            const dataUrl = await generateDatamatrixCode(dataString);
            
            const card = document.createElement('div');
            card.className = 'datamatrix-card';
            
            card.innerHTML = `
                <div class="datamatrix-image">
                    <img src="${dataUrl}" alt="DataMatrix for ordinal ${ordinal}">
                </div>
                <div class="ordinal-number">Ordinal: ${ordinal}</div>
                <div class="bet-info">Data Matrix Code</div>
            `;
            
            datamatrixContainer.appendChild(card);
            successfulGenerations++;
            
        } catch (error) {
            console.error(`Error generating DataMatrix for ordinal ${ordinal}:`, error);
            errors.push(`Ordinal ${ordinal}: ${error.message}`);
            
            // Create error card
            const errorCard = document.createElement('div');
            errorCard.className = 'datamatrix-card';
            errorCard.innerHTML = `
                <div class="datamatrix-image" style="color: #e74c3c;">
                    Failed to generate<br>DataMatrix
                </div>
                <div class="ordinal-number">Ordinal: ${ordinal}</div>
                <div class="bet-info" style="color: #e74c3c;">Error: ${error.message}</div>
            `;
            datamatrixContainer.appendChild(errorCard);
        }
    }
    
    // Show debug info
    let debugText = `DataMatrix Generation Results:\n`;
    debugText += `- Successful: ${successfulGenerations}/${aggregatedDataList.length}\n`;
    if (errors.length > 0) {
        debugText += `- Errors: ${errors.length}\n`;
        errors.forEach(err => debugText += `  - ${err}\n`);
    }
    showDebugInfo(debugText);
    
    // Show warning if some DataMatrix generations failed
    if (errors.length > 0) {
        showStatus(`Generated ${successfulGenerations} DataMatrix images, but ${errors.length} failed. Check debug info.`, 'warning');
    }
    
    // Show results section
    resultsSection.style.display = 'block';
}