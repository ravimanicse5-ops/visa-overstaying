export const ESP32_ARDUINO_FIRMWARE = `/*
 * =================================================================================
 * Project: e-FRRO ProActive - Hardware E-Gate Simulation & Voice Alert Firmware
 * Target: ESP32 Dev Module / NodeMCU-32S
 * Hardware Components:
 *   - 16x2 I2C LCD Display (Address: 0x27 or 0x3F) -> SDA: GPIO 21, SCL: GPIO 22
 *   - DFPlayer Mini MP3 Voice Module -> TX: GPIO 17, RX: GPIO 16 (Serial2)
 *   - Status LEDs / Relay Gate: Green (GPIO 25), Red (GPIO 26), Turnstile Servo (GPIO 13)
 *   - Barcode / RFID / Serial Scanner -> Serial / USB Host
 * =================================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SoftwareSerial.h>
#include <DFRobotDFPlayerMini.h>
#include <ESP32Servo.h>

// Wi-Fi Credentials
const char* ssid = "YOUR_AIRPORT_WIFI";
const char* password = "WIFI_PASSWORD_SECURE";

// e-FRRO Cloud Engine API Base URL
const char* apiBaseUrl = "http://YOUR_SERVER_IP:3000/api/gate/scan/";
const char* gateId = "EGATE_DEL_T3_04";

// Pin Definitions
#define PIN_LED_GREEN   25   // Gate Clearance Granted
#define PIN_LED_RED     26   // Overstay / Flagged Intercept
#define PIN_SERVO_GATE  13   // Turnstile Flap Barrier Servo
#define PIN_BUZZER      33   // Alert Sounder

// Peripherals Setup
LiquidCrystal_I2C lcd(0x27, 16, 2);
HardwareSerial dfSerial(2); // Serial2 for DFPlayer Mini
DFRobotDFPlayerMini myDFPlayer;
Servo gateServo;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[e-FRRO E-Gate] Initializing Departure Hardware Terminal...");

  // Initialize GPIOs
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  // Initialize Servo
  gateServo.attach(PIN_SERVO_GATE);
  gateServo.write(0); // 0 degrees = Closed Gate

  // Initialize LCD Display
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("e-FRRO PROACTIVE");
  lcd.setCursor(0, 1);
  lcd.print("E-GATE T3 DEL 04");
  delay(2000);

  // Initialize DFPlayer Voice Module
  dfSerial.begin(9600, SERIAL_8N1, 16, 17);
  if (!myDFPlayer.begin(dfSerial)) {
    Serial.println("[WARN] DFPlayer Mini not responding or SD card missing.");
  } else {
    Serial.println("[OK] DFPlayer Mini Online.");
    myDFPlayer.volume(28); // Volume: 0-30
  }

  // Connect to Wi-Fi
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");
  WiFi.begin(ssid, password);
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[OK] WiFi Connected: " + WiFi.localIP().toString());
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("GATE READY [T3]");
    lcd.setCursor(0, 1);
    lcd.print("SCAN PASSPORT/QR");
  } else {
    Serial.println("\n[WARN] WiFi Failed. Running in Standalone Mode.");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WIFI ERROR");
  }
}

void loop() {
  // Check for Passport or eSIM barcode scanned on USB/Serial
  if (Serial.available() > 0) {
    String scannedIdentifier = Serial.readStringUntil('\\n');
    scannedIdentifier.trim();
    if (scannedIdentifier.length() > 0) {
      processGateScan(scannedIdentifier);
    }
  }
  delay(100);
}

void processGateScan(String identifier) {
  Serial.println("\\n>>> PROCESSING SCAN: " + identifier);
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("VERIFYING VISA..");
  lcd.setCursor(0, 1);
  lcd.print(identifier.substring(0, 16));

  if (WiFi.status() != WL_CONNECTED) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("NETWORK ERROR");
    return;
  }

  HTTPClient http;
  String fullUrl = String(apiBaseUrl) + identifier;
  http.begin(fullUrl);
  int httpCode = http.GET();

  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    Serial.println("Response: " + payload);

    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (error) {
      Serial.println("JSON parse failed");
      return;
    }

    const char* passport = doc["passport_number"];
    const char* name = doc["full_name"];
    const char* status = doc["status"];
    int overstay_days = doc["overstay_days"];
    float fine = doc["fine"];
    const char* gate_action = doc["gate_action"];
    const char* message = doc["message"];

    if (String(gate_action) == "GRANTED") {
      // CLEARANCE GRANTED
      digitalWrite(PIN_LED_GREEN, HIGH);
      digitalWrite(PIN_LED_RED, LOW);
      
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("GATE OPEN: PASS");
      lcd.setCursor(0, 1);
      lcd.print("HAVE SAFE FLIGHT");

      // Voice Audio: Play Track 001 (Clearance Granted)
      myDFPlayer.play(1);

      // Open Flap Barrier
      gateServo.write(90);
      delay(4000);
      gateServo.write(0); // Re-close
      digitalWrite(PIN_LED_GREEN, LOW);

    } else {
      // ACCESS DENIED & OVERSTAY INTERCEPT
      digitalWrite(PIN_LED_GREEN, LOW);
      digitalWrite(PIN_LED_RED, HIGH);
      
      // Beep Buzzer
      digitalWrite(PIN_BUZZER, HIGH);
      delay(300);
      digitalWrite(PIN_BUZZER, LOW);

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("OVERSTAY DETECT!");
      lcd.setCursor(0, 1);
      String line2 = "FINE: INR " + String((int)fine);
      lcd.print(line2);

      // Voice Audio: Play Track 002 (Overstay Warning & Report to Counter)
      myDFPlayer.play(2);

      delay(5000);
      digitalWrite(PIN_LED_RED, LOW);
    }

    // Reset LCD to Ready state
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("GATE READY [T3]");
    lcd.setCursor(0, 1);
    lcd.print("SCAN PASSPORT/QR");

  } else {
    Serial.println("[ERR] HTTP GET failed, error code: " + String(httpCode));
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("SERVER COMM ERR");
    delay(2000);
  }

  http.end();
}
`;
