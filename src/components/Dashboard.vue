<template>
    <v-navigation-drawer permanent location="right" :rail="!displaySidebar" width="500">
        <v-container v-if="displaySidebar && selectedObject">
            <h1>Name: {{ selectedObject.name }}</h1>
            <v-card-subtitle>ID: {{ selectedObject.id }}</v-card-subtitle>
            <v-card-subtitle>NEO ID: {{ selectedObject.neo_reference_id }}</v-card-subtitle>
            <v-divider></v-divider>
            <h1 v-if="selectedObject.is_potentially_hazardous_asteroid"
                style="color: red; font-weight: bold; text-align: center; margin-top: 10px; margin-bottom: 10px;">WARNING:
                HAZARDOUS</h1>
            <v-divider v-if="selectedObject.is_potentially_hazardous_asteroid"></v-divider>
            <v-card-text>
                <h2>Estimated Diameter</h2>
                <p>Min: {{ formatNumber(selectedObject.estimated_diameter.kilometers.estimated_diameter_min) }}</p>
                <p>Max: {{ formatNumber(selectedObject.estimated_diameter.kilometers.estimated_diameter_max) }}</p>
            </v-card-text>
            <v-divider></v-divider>
            <v-card-text>
                <h2>Close Approach Data</h2>
                <v-list>
                    <v-list-item v-for="approach in selectedObject.close_approach_data"
                        :key="approach.epoch_date_close_approach">
                        <v-list-item-title>{{ approach.close_approach_date_full }}</v-list-item-title>
                        <v-list-item-subtitle>Relative Velocity: {{
                            formatNumber(Number(approach.relative_velocity.kilometers_per_second), "km/s")
                        }}</v-list-item-subtitle>
                        <v-list-item-subtitle>Miss Distance: {{ formatNumber(Number(approach.miss_distance.lunar), "ld")
                        }}</v-list-item-subtitle>
                        <v-list-item-subtitle>
                            Orbiting Body: {{ approach.orbiting_body }}
                        </v-list-item-subtitle>
                    </v-list-item>
                </v-list>
            </v-card-text>
            <v-divider></v-divider>
            <v-card-text>
                <p>Is Sentry Object: {{ selectedObject.is_sentry_object ? "Yes" : "No" }}</p>
                <p>Absolute Magnitude: {{ selectedObject.absolute_magnitude_h }} H</p>
            </v-card-text>
        </v-container>

    </v-navigation-drawer>
    <!-- I want to make this expand to take up the extra space of the navigation drawer if the drawer is not being displayed -->
    <v-container fluid>
        <v-row>
            <v-col v-for="item in getData" :key="item.id" cols="12" :md="displaySidebar ? 3 : 2">
                <v-card :style="item.is_potentially_hazardous_asteroid ? { border: '4px solid red' } : {}"
                    @click="manageSelectedObject(item)" :color="selectedObject === item ? 'indigo' : ''">
                    <v-card-title>{{ item.name }}</v-card-title>
                    <v-card-subtitle>{{ item.id }}</v-card-subtitle>
                    <v-card-text>Diameter: {{ formatNumber(item.estimated_diameter.kilometers.estimated_diameter_max)
                    }}</v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup lang="ts">

import { computed, ref } from 'vue';
import { NearEarthObject } from '../NasaData';
const props = defineProps(['data']) as { data: NearEarthObject[] | null }
const getData = computed(() => props.data)

const displaySidebar = ref(false)

const formatNumber = (diameter: number, unit?: string) => {
    return `${diameter.toFixed(4)} ${unit || 'km'}`
}

const selectedObject = ref<NearEarthObject | null>(null)

function manageSelectedObject(item: NearEarthObject) {
    if (selectedObject.value === item) {
        selectedObject.value = null
        displaySidebar.value = false
    } else {
        selectedObject.value = item
        displaySidebar.value = true
    }
}

</script>