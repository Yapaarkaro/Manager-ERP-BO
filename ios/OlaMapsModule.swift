import Foundation
import React
import CoreLocation

@objc(OlaMapsModule)
class OlaMapsModule: RCTEventEmitter {
  
  private var olaMapService: OlaMapService?
  private var currentMarker: String?
  
  override init() {
    super.init()
  }
  
  override func supportedEvents() -> [String]! {
    return ["onMapClick", "onMarkerDragEnd", "onMapLoad", "onCurrentLocationUpdate"]
  }
  
  @objc
  func initializeMap(_ projectId: String, apiKey: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      do {
        // Initialize Ola Maps SDK
        self.olaMapService = OlaMapService(
          auth: .apiKey(key: apiKey),
          tileURL: URL(string: "https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json")!,
          projectId: projectId
        )
        
        // Set up delegate
        self.olaMapService?.delegate = self
        
        // Set initial configuration
        self.olaMapService?.setMaxZoomLevel(18.0)
        self.olaMapService?.setDebugLogs(true)
        
        resolve(true)
      } catch {
        reject("INIT_ERROR", "Failed to initialize Ola Maps", error)
      }
    }
  }
  
  @objc
  func loadMap(_ viewTag: NSNumber, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let olaMapService = self.olaMapService else {
        reject("NOT_INITIALIZED", "Ola Maps not initialized", nil)
        return
      }
      
      // Find the React Native view
      if let view = self.bridge?.uiManager.view(forReactTag: viewTag) {
        olaMapService.loadMap(onView: view)
        resolve(true)
      } else {
        reject("VIEW_NOT_FOUND", "React Native view not found", nil)
      }
    }
  }
  
  @objc
  func setCamera(_ lat: Double, lng: Double, zoom: Double, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let olaMapService = self.olaMapService else {
        reject("NOT_INITIALIZED", "Ola Maps not initialized", nil)
        return
      }
      
      let coordinate = OlaCoordinate(latitude: lat, longitude: lng)
      olaMapService.setCamera(at: coordinate, zoomLevel: zoom)
      resolve(true)
    }
  }
  
  @objc
  func addMarker(_ markerId: String, lat: Double, lng: Double, title: String, isDraggable: Bool, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let olaMapService = self.olaMapService else {
        reject("NOT_INITIALIZED", "Ola Maps not initialized", nil)
        return
      }
      
      let coordinate = OlaCoordinate(latitude: lat, longitude: lng)
      
      // Create custom annotation view
      let annotationView = CustomAnnotationView(
        identifier: markerId,
        model: CustomAnnotationDecorator(),
        text: title,
        isActive: true
      )
      
      olaMapService.setAnnotationMarker(
        at: coordinate,
        annotationView: annotationView,
        identifier: markerId
      )
      
      self.currentMarker = markerId
      resolve(true)
    }
  }
  
  @objc
  func removeMarker(_ markerId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let olaMapService = self.olaMapService else {
        reject("NOT_INITIALIZED", "Ola Maps not initialized", nil)
        return
      }
      
      olaMapService.removeAnnotation(by: markerId)
      resolve(true)
    }
  }
  
  @objc
  func getCurrentLocation(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let olaMapService = self.olaMapService else {
        reject("NOT_INITIALIZED", "Ola Maps not initialized", nil)
        return
      }
      
      // Add current location button and get location
      olaMapService.addCurrentLocationButton(UIView())
      olaMapService.setCurrentLocationMarkerColor(UIColor.systemBlue)
      
      // The location will be received via delegate method
      resolve(true)
    }
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
}

// MARK: - OlaMapServiceDelegate
extension OlaMapsModule: OlaMapServiceDelegate {
  
  func didTapOnMap(_ coordinate: OlaCoordinate) {
    sendEvent(withName: "onMapClick", body: [
      "lat": coordinate.latitude,
      "lng": coordinate.longitude
    ])
  }
  
  func didTapOnMap(feature: POIModel) {
    // Handle POI tap if needed
  }
  
  func didLongTapOnMap(_ coordinate: OlaCoordinate) {
    // Handle long tap if needed
  }
  
  func didChangeCamera() {
    // Handle camera change if needed
  }
  
  func mapSuccessfullyLoaded() {
    sendEvent(withName: "onMapLoad", body: nil)
  }
  
  func mapSuccessfullyLoadedStyle() {
    // Handle style loaded if needed
  }
}

// MARK: - Custom Annotation Classes
class CustomAnnotationView: OlaAnnotation {
  let title: String
  
  init(identifier: String, model: CustomAnnotationDecorator, text: String, isActive: Bool) {
    self.title = text
    super.init(identifier: identifier, model: model)
  }
}

class CustomAnnotationDecorator: OlaAnnotationDecorator {
  override func getAnnotationView() -> UIView {
    let view = UIView()
    view.backgroundColor = UIColor.systemBlue
    view.layer.cornerRadius = 8
    view.frame = CGRect(x: 0, y: 0, width: 16, height: 16)
    return view
  }
} 