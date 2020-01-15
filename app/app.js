import Vue from "nativescript-vue";
import Home from "./components/Home";
import { isIOS } from "tns-core-modules/platform";

if (isIOS) {
    GMSServices.provideAPIKey("REPLACE_WITH_IOS_KEY");
}
Vue.registerElement(
    "MapView",
    () => require("nativescript-google-maps-sdk").MapView
);
Vue.config.silent = true;

new Vue({
    template: `
        <Frame>
            <Home />
        </Frame>`,

    components: {
        Home
    }
}).$start();
