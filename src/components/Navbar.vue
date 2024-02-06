<template>
    <v-app>
        <v-navigation-drawer expand-on-hover :rail="rail" permanent @click="rail = false">
            <v-list>
                <v-list-item prepend-icon="mdi-theme-light-dark"
                    :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="emit('toggle')">
                </v-list-item>
            </v-list>
            <v-divider></v-divider>
            <v-list>
                <v-dialog width="100%">
                    <template v-slot:activator="{ props }">
                        <v-btn width="100%" v-bind="props" text="Select a Date"> </v-btn>
                    </template>

                    <template v-slot:default="{ isActive }">
                        <v-date-picker v-model="something" @update:model-value="selectedDate = something.toISOString().split('T')[0]; isActive.value = false; getNasaData()"></v-date-picker>
                    </template>
                </v-dialog>
                <v-card-title>Selected Date:</v-card-title>
                <v-card-subtitle>{{ selectedDate == "" ? "None" : selectedDate}}</v-card-subtitle>
            </v-list>
        </v-navigation-drawer>
        <v-main>
            <Dashboard :data="data?.near_earth_objects[selectedDate]" />
        </v-main>
    </v-app>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Convert, NasaData } from "../NasaData";
import NASA_API_KEY from "../.secret";



const rail = ref(false)
const emit = defineEmits(['toggle'])

const selectedDate = ref(new Date().toISOString().split('T')[0])

const something = ref()

const props = defineProps({
    isDarkMode: Boolean,
})

const isDark = computed(() => props.isDarkMode)

let data = ref<NasaData | null>(null)

const getNasaData = async () => {
    data.value = null;
    // format the day as YYYY-MM-DD
    const response = await fetch('https://api.nasa.gov/neo/rest/v1/feed?start_date=' + selectedDate.value + '&api_key=' + NASA_API_KEY);
    const json = await response.json();
    data.value = Convert.toNasaData(JSON.stringify(json));
}

getNasaData()

</script> 