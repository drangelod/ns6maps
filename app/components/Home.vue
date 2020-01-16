<template>
    <Page actionBarHidden="true" backgroundSpanUnderStatusBar="false">
        <StackLayout height="100%" width="100%">
            <SearchBar hint="What are you looking for?" v-model="searchPhrase" @submit="onSubmit" textFieldHintColor="gray" marginTop="20" />
            <MapView iosOverflowSafeArea="true" :latitude="latitude" :longitude="longitude" :zoom="zoom" :bearing="bearing" :tilt="tilt" height="100%" @mapReady="onMapReady" @markerSelect="onMarkerSelect()" @markerInfoWindowTapped="onMarkerInfoWindowTapped()"></MapView>
        </StackLayout>
    </Page>
</template>

<script>
import { isIOS, isAndroid } from "tns-core-modules/platform";
const geolocation = require("nativescript-geolocation");
const mapsModule = require("nativescript-google-maps-sdk");
import { ImageSource } from "tns-core-modules/image-source";
import { Image } from "tns-core-modules/ui/image";
import * as http from "http";
export default {
    data() {
        return {
            latitude: '',
            longitude: '',
            zoom: '',
            bearing: '',
            tilt: '',
            mapView: null,
            isMounted: false,
            searchPhrase: '',
        }
    },
    mounted() {
        let that = this
        geolocation.isEnabled().then(function(isEnabled) {
            if (!isEnabled) {
                geolocation.enableLocationRequest(true, true).then(() => {
                    that.isMounted = true
                    if (isAndroid && that.mapView) {
                        let uiSettings = that.mapView.gMap.getUiSettings();
                        uiSettings.setMyLocationButtonEnabled(true);
                        that.mapView.gMap.setMyLocationEnabled(true);
                    }
                    geolocation
                        .getCurrentLocation({
                            timeout: 20000
                        })
                        .then(location => {
                            if (!location) {
                                console.log("Failed to get location!");
                            } else {
                                that.latitude = location.latitude
                                that.longitude = location.longitude
                                that.zoom = 14
                                that.bearing = 0
                                that.altitude = 0
                            }

                        });
                }, (e) => {
                    console.log("Error: " + (e.message || e));
                }).catch(ex => {
                    console.log("Unable to Enable Location", ex);
                });
            } else {
                that.isMounted = true
                if (isAndroid && that.mapView) {
                    let uiSettings = that.mapView.gMap.getUiSettings();
                    uiSettings.setMyLocationButtonEnabled(true);
                    that.mapView.gMap.setMyLocationEnabled(true);
                }
                geolocation
                    .getCurrentLocation({
                        timeout: 20000
                    })
                    .then(location => {
                        if (!location) {
                            console.log("Failed to get location!");
                        } else {
                            that.latitude = location.latitude
                            that.longitude = location.longitude
                            that.zoom = 14
                            that.bearing = 0
                            that.altitude = 0
                        }

                    });

            }
        }, function(e) {
            console.log("Error: " + (e.message || e));
        });

    },
    methods: {
        onSubmit() {
            let that = this
            geolocation
                .getCurrentLocation({
                    timeout: 20000
                })
                .then(location => {
                    if (!location) {
                        console.log("Failed to get location!");
                    } else {
                        that.latitude = location.latitude
                        that.longitude = location.longitude
                        that.mapView.removeAllMarkers()
                        let searchurl = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=" + that.latitude + "," + that.longitude + "&radius=1000&keyword=" + encodeURI(that.searchPhrase) + "&key=REPLACE_WITH_PLACES_KEY"
                        http
                            .request({
                                url: searchurl,
                                method: "GET",
                                timeout: 10000,
                                headers: { "Content-Type": "application/json" }
                            })
                            .then(function(data) {
                                if (data.statusCode == 200) {
                                    let result = JSON.parse(data.content);
                                    let results = result.results
                                    var bounds
                                    let padding = 100
                                    if (isIOS) {
                                        bounds = GMSCoordinateBounds.alloc().init();
                                    }
                                    results.forEach(element => {
                                        var marker = new mapsModule.Marker();
                                        marker.position = mapsModule.Position.positionFromLatLng(
                                            element.geometry.location.lat,
                                            element.geometry.location.lng
                                        );
                                        if (isIOS) bounds = bounds.includingCoordinate(marker.position);
                                        marker.title = element.name;
                                        marker.type = element.types[0]
                                        marker.address = element.vicinity
                                        // marker.color = "green"
                                        let imageSource = ImageSource.fromFileSync("~/images/foodicon.png");
                                        const icon = new Image();
                                        icon.imageSource = imageSource;
                                        marker.icon = icon;
                                        that.mapView.addMarker(marker);
                                    })
                                    if (isAndroid) {
                                        var builder = new com.google.android.gms.maps.model.LatLngBounds.Builder();
                                        that.mapView.findMarker(function(marker) { builder.include(marker.android.getPosition()); });
                                        bounds = builder.build();
                                        var cu = com.google.android.gms.maps.CameraUpdateFactory.newLatLngBounds(bounds, padding);
                                        that.mapView.gMap.animateCamera(cu);
                                    }
                                    if (isIOS) {
                                        var update = GMSCameraUpdate.fitBoundsWithPadding(bounds, padding);
                                        that.mapView.gMap.animateWithCameraUpdate(update);
                                    }
                                } else {
                                    console.log("Error getting google places data");
                                    console.dir(data);
                                }
                            })
                            .catch(e => {
                                console.log("Error getting google places data");
                                console.error(e);
                            });
                    }

                });
        },
        onMapReady(args) {
            this.mapView = args.object;
            var gMap = this.mapView.gMap;
            this.mapView.settings.myLocationEnabled = true;
            this.mapView.settings.myLocationButtonEnabled = true
            this.mapView.settings.compassEnabled = true
            this.mapView.settings.zoomGesturesEnabled = true;
            if (isAndroid && this.isMounted && geolocation.isEnabled()) {
                let uiSettings = gMap.getUiSettings();
                uiSettings.setMyLocationButtonEnabled(true);
                gMap.setMyLocationEnabled(true);
            }
            if (isIOS) {
                gMap.myLocationEnabled = true;
                gMap.settings.myLocationButton = true;
                this.mapView.on("myLocationTapped", event => {
                    geolocation.isEnabled().then(enabled => {
                        if (enabled) {
                            geolocation.getCurrentLocation({
                                maximumAge: 5000,
                                timeout: 20000
                            }).then(location => {
                                gMap.animateToLocation(location);
                            });
                        }
                    });
                });
            }
            this.mapView.infoWindowTemplate = `<StackLayout orientation="vertical" width="240" height="140"  >
        	    <Label text="{{title}}"  marginTop="26" marginLeft="20"    textWrap="true" color="black"  fontSize="18" />
                <Label text="{{type}}"  marginLeft="20"    textWrap="true" color="gray"  fontSize="12" />
                <Label text="{{address}}"  marginLeft="20"    textWrap="true" color="gray"  fontSize="14" />
            </StackLayout>`;
        },
        onMarkerSelect() {},
        onMarkerInfoWindowTapped() {},
    },
};
</script>

<style scoped>

</style>
