import { TAB_BAR_BOTTOM_OFFSET, TAB_BAR_HEIGHT } from "@/constants/layout";

/** Static tab bar chrome. Apply `bottom: TAB_BAR_BOTTOM_OFFSET + insets.bottom` at runtime. */
export const TabBarStyle = {
    style : {
                position: 'absolute',
                bottom: TAB_BAR_BOTTOM_OFFSET,
                left: 20,
                right: 20,
                height: TAB_BAR_HEIGHT,
                backgroundColor: '#000A1C',
                borderRadius: 35,          // hace que se vea ovalado
                borderTopWidth: 0,         // elimina borde feo default
                elevation: 5,              // sombra Android
                shadowColor: '#000',       // sombra iOS
                shadowOpacity: 0.1,
                shadowOffset: { width: 0, height: 4 },
                shadowRadius: 8,
                paddingBottom: 10,
                paddingTop: 10,
                marginHorizontal: 20
            }
}