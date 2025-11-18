let worldMap;              // mappa
let volcanoesData;         
let volcanoesRawData;      
let volcanoPositions = []; 

function preload() {
  // Gestione errori per debug
  worldMap = loadImage('mappa-del-mondo-grigia.png', 
    () => console.log('Immagine mappa caricata correttamente'),
    (err) => {
      console.error('Errore nel caricamento della mappa:', err);
      // Fallback: continuare senza mappa
    }
  ); 
  volcanoesRawData = loadStrings('volcanoes-2025-10-27 - Es.3.csv',
    () => console.log('Dati vulcani caricati correttamente'),
    (err) => console.error('Errore nel caricamento dei dati:', err)
  ); 
}

function setup() {
  createCanvas(windowWidth, windowHeight); background(0); textFont('Arial');
  volcanoesData = processCSVData(volcanoesRawData);
}

function draw() {
  background(0);
  
  // Controllo se la mappa è caricata correttamente
  if (!worldMap || worldMap.width === 0) {
    // Fallback: mostra messaggio di caricamento
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(24);
    text("Caricamento mappa dei vulcani...", width/2, height/2 - 20);
    textSize(16);
    text("Controlla la console per eventuali errori", width/2, height/2 + 20);
    return;
  }
  
  let mapWidth = width * 0.9, mapHeight = (worldMap.height / worldMap.width) * mapWidth;
  
  if (mapHeight > height * 0.9) {
    mapHeight = height * 0.9; mapWidth = (worldMap.width / worldMap.height) * mapHeight;
  }
  
  let x = (width - mapWidth) / 2, y = (height - mapHeight) / 2;
  
  image(worldMap, x, y, mapWidth, mapHeight); drawCoordinateGrid(x, y, mapWidth, mapHeight);     
  drawVolcanoes(x, y, mapWidth, mapHeight); drawLegends(); updateCursor(); 
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// elaborazione dati
function processCSVData(rawData) {
  let processedData = [];
  for (let line of rawData) {
    if (line.trim() !== '') {
      let columns = line.split(';').map(col => col.trim()); 
      processedData.push(columns);
    }
  }
  return processedData;
}

function latLonToPixel(lat, lon, mapX, mapY, mapW, mapH) {
  return { 
    x: mapX + ((lon + 180) / 360) * mapW - mapW * 0.03, 
    y: mapY + ((90 - lat) / 180) * mapH + mapH * 0.12 
  };
}

function drawCoordinateGrid(mapX, mapY, mapW, mapH) {
  stroke(100, 100, 100, 150); strokeWeight(1);
  
  for (let lon = -180; lon <= 180; lon += 30) {
    let startPoint = latLonToPixel(90, lon, mapX, mapY, mapW, mapH);
    let endPoint = latLonToPixel(-90, lon, mapX, mapY, mapW, mapH);
    line(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
    fill(200); noStroke(); textAlign(CENTER, TOP); textSize(12);
    text(lon + "°", startPoint.x, mapY + mapH + 10);
  }
  
  for (let lat = -90; lat <= 90; lat += 30) {
    let startPoint = latLonToPixel(lat, -180, mapX, mapY, mapW, mapH);
    let endPoint = latLonToPixel(lat, 180, mapX, mapY, mapW, mapH);
    stroke(100, 100, 100, 150); strokeWeight(1);
    line(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
    fill(200); noStroke(); textAlign(RIGHT, CENTER); textSize(12);
    text(lat + "°", mapX - 10, startPoint.y);
  }
  
  stroke(150, 150, 150, 200); strokeWeight(2);
  let equatorStart = latLonToPixel(0, -180, mapX, mapY, mapW, mapH);
  let equatorEnd = latLonToPixel(0, 180, mapX, mapY, mapW, mapH);
  line(equatorStart.x, equatorStart.y, equatorEnd.x, equatorEnd.y);
  let greenwichStart = latLonToPixel(90, 0, mapX, mapY, mapW, mapH);
  let greenwichEnd = latLonToPixel(-90, 0, mapX, mapY, mapW, mapH);
  line(greenwichStart.x, greenwichStart.y, greenwichEnd.x, greenwichEnd.y);
}

function drawVolcanoes(mapX, mapY, mapW, mapH) {
  if (!volcanoesData || volcanoesData.length <= 1) return;
  volcanoPositions = [];

  let header = volcanoesData[0];
  let nameIndex = header.indexOf('Volcano Name'), countryIndex = header.indexOf('Country');
  let locationIndex = header.indexOf('Location'), latIndex = header.indexOf('Latitude');
  let lonIndex = header.indexOf('Longitude'), elevationIndex = header.indexOf('Elevation (m)');
  let typeIndex = header.indexOf('Type'), statusIndex = header.indexOf('Status');
  let eruptionIndex = header.indexOf('Last Known Eruption');
  
  if (latIndex === -1 || lonIndex === -1) return;
  
  for (let i = 1; i < volcanoesData.length; i++) {
    let row = volcanoesData[i];
    let latitude = parseFloat((row[latIndex] || '').replace(',', '.'));
    let longitude = parseFloat((row[lonIndex] || '').replace(',', '.'));
    
    if (isNaN(latitude) || isNaN(longitude)) continue;
    
    let pos = latLonToPixel(latitude, longitude, mapX, mapY, mapW, mapH);
    
    if (pos.x >= mapX && pos.x <= mapX + mapW && pos.y >= mapY && pos.y <= mapY + mapH) {
      let name = row[nameIndex] || 'Unknown', country = row[countryIndex] || 'Unknown';
      let location = row[locationIndex] || 'Unknown', type = row[typeIndex] || 'Unknown';
      let status = row[statusIndex] || 'Unknown', eruption = row[eruptionIndex] || 'Unknown';
      let elevation = parseFloat((row[elevationIndex] || '0').replace(',', '.'));
      
      volcanoPositions.push({
        x: pos.x, y: pos.y, name: name, country: country, location: location,
        elevation: elevation, type: type, status: status, eruption: eruption,
        latitude: latitude, longitude: longitude,
        size: map(elevation, -1500, 6000, 3, 9)
      });
      drawCustomTriangle(pos.x, pos.y, elevation, type, status, eruption);
    }
  }
}

function drawCustomTriangle(x, y, elevation, type, status, eruption) {
  let size = (!isNaN(elevation) && elevation !== 0) ? constrain(map(abs(elevation), 0, 6000, 3, 9), 3, 9) : 4;
  
  let fillColor = color(100, 255, 100), strokeColor = color(50, 200, 50);
  let statusLower = status.toLowerCase();
  
  if (statusLower === 'historical') { fillColor = color(255, 100, 255); strokeColor = color(200, 50, 200); }
  else if (statusLower === 'holocene') { fillColor = color(180, 120, 200); strokeColor = color(130, 80, 150); }
  else if (statusLower === 'pleistocene') { fillColor = color(120, 200, 120); strokeColor = color(80, 150, 80); }
  else if (statusLower === 'hydrophonic') { fillColor = color(100, 180, 150); strokeColor = color(50, 130, 100); }
  
  let shapeType = 'circle', typeText = type.toLowerCase();
  
  if (typeText.includes('stratovolcano') || typeText.includes('somma')) shapeType = 'triangle';
  else if (typeText.includes('caldera') || typeText.includes('maar') || typeText.includes('tuff')) shapeType = 'square';
  else if (typeText.includes('cone') || typeText.includes('cinder') || typeText.includes('scoria') || typeText.includes('pumice') || typeText.includes('pyroclastic')) shapeType = 'pentagon';
  else if (typeText.includes('crater') || typeText.includes('fissure') || typeText.includes('complex') || typeText.includes('field') || typeText.includes('compound') || typeText.includes('explosion')) shapeType = 'star';
  else if (typeText.includes('shield') || typeText.includes('subglacial') || typeText.includes('submarine')) shapeType = 'diamond';
  
  let opacity = eruption.includes('D1') ? 255 : eruption.includes('D2') ? 240 : eruption.includes('U') ? 220 : 200;
  fillColor = color(red(fillColor), green(fillColor), blue(fillColor), opacity);
  strokeColor = color(red(strokeColor), green(strokeColor), blue(strokeColor), opacity);
  
  fill(fillColor); stroke(strokeColor); strokeWeight(1);
  
  switch(shapeType) {
    case 'triangle': triangle(x, y - size*0.7, x - size*0.6, y + size*0.7, x + size*0.6, y + size*0.7); break;
    case 'diamond': quad(x, y - size*0.8, x + size*0.8, y, x, y + size*0.8, x - size*0.8, y); break;
    case 'square': noFill(); strokeWeight(1.5); rectMode(CENTER); rect(x, y, size*1.6, size*1.6); break;
    case 'pentagon': drawPentagon(x, y, size*0.9); break;
    case 'star': drawStar(x, y, size*0.8); break;
    default: ellipse(x, y, size*1.8, size*1.8);
  }
}

// legenda colori
function drawColorLegend(x, y, w) {
  fill(255); noStroke(); textAlign(LEFT, TOP); textSize(13); text("VOLCANIC ACTIVITY", x + 15, y + 15);
  let barX = x + 15, barY = y + 40, barW = w - 30, barH = 15;
  
  for (let i = 0; i <= barW; i++) {
    stroke(lerpColor(color(100, 255, 100), color(255, 100, 255), i / barW));
    line(barX + i, barY, barX + i, barY + barH);
  }
  
  fill(255); noStroke(); textSize(10);
  textAlign(LEFT, TOP); text("INACTIVE", barX, barY + barH + 5);
  textAlign(RIGHT, TOP); text("ACTIVE", barX + barW, barY + barH + 5);
  
  textAlign(LEFT, TOP); textSize(9); fill(200);
  let labelY = barY + barH + 25;
  text("Green: Pleistocene+ • Green-purple: Holocene • Purple: Historical", barX, labelY);
}

// legenda forme
function drawShapeLegend(x, y, w) {
  fill(255); noStroke(); textAlign(LEFT, TOP); textSize(13); text("VOLCANO TYPES", x + 15, y + 15);
  
  let shapes = [
    {type: "triangle", desc: "Stratovolcano"}, {type: "square", desc: "Caldera, Maar/Tuff"},
    {type: "pentagon", desc: "Cones (Cinder, Scoria, etc.)"}, {type: "star", desc: "Complex crater systems"},
    {type: "diamond", desc: "Shield, Subglacial, Submarine"}, {type: "circle", desc: "Others (Dome, Fumarole, Unknown)"}
  ];
  
  for (let i = 0; i < shapes.length; i++) {
    let itemY = y + 40 + i * 22, size = 6;
    fill(180, 180, 180); stroke(120, 120, 120); strokeWeight(1);
    
    switch(shapes[i].type) {
      case 'triangle': triangle(x + 25, itemY - size, x + 25 - size, itemY + size, x + 25 + size, itemY + size); break;
      case 'diamond': quad(x + 25, itemY - size, x + 25 + size, itemY, x + 25, itemY + size, x + 25 - size, itemY); break;
      case 'pentagon': drawPentagon(x + 25, itemY, size); break;
      case 'square': noFill(); strokeWeight(1.5); rectMode(CENTER); rect(x + 25, itemY, size*2, size*2); fill(180, 180, 180); break;
      case 'star': drawStar(x + 25, itemY, size); break;
      default: ellipse(x + 25, itemY, size*2, size*2);
    }
    
    fill(255); noStroke(); textSize(10); textAlign(LEFT, CENTER); text(shapes[i].desc, x + 45, itemY);
  }
  
  fill(180); noStroke(); textSize(9); textAlign(LEFT, TOP);
  text("• Size = Volcano elevation • Transparency = Last eruption", x + 15, y + 175);
}

// legende
function drawLegends() {
  let legendW = 250, legendX = width - legendW - 20;
  drawColorLegend(legendX, 20, legendW); drawShapeLegend(legendX, 170, legendW);
}

// pentagono
function drawPentagon(x, y, size) {
  beginShape();
  for (let i = 0; i < 5; i++) {
    let angle = TWO_PI / 5 * i - PI/2;
    vertex(x + cos(angle) * size, y + sin(angle) * size);
  }
  endShape(CLOSE);
}
// stella
function drawStar(x, y, size) {
  beginShape();
  for (let i = 0; i < 10; i++) {
    let angle = TWO_PI / 10 * i - PI/2, radius = (i % 2 === 0) ? size : size * 0.4;
    vertex(x + cos(angle) * radius, y + sin(angle) * radius);
  }
  endShape(CLOSE);
}

function updateCursor() {
  let isOverVolcano = false;
  for (let volcano of volcanoPositions) {
    if (dist(mouseX, mouseY, volcano.x, volcano.y) <= volcano.size + 3) {
      isOverVolcano = true;
      break;
    }
  }
  cursor(isOverVolcano ? HAND : ARROW);
}

// click sui vulcani
function mousePressed() {
  for (let volcano of volcanoPositions) {
    if (dist(mouseX, mouseY, volcano.x, volcano.y) <= volcano.size + 3) {
      openVolcanoDetails(volcano);
      break;
    }
  }
}

// Funzione per aprire la pagina dei dettagli del vulcano
function openVolcanoDetails(volcano) {
  const params = new URLSearchParams({
    name: volcano.name,
    country: volcano.country,
    location: volcano.location,
    elevation: volcano.elevation,
    type: volcano.type,
    status: volcano.status,
    eruption: volcano.eruption,
    lat: volcano.latitude,
    lon: volcano.longitude
  });
  
  window.open('volcano-details.html?' + params.toString(), '_blank');
}
