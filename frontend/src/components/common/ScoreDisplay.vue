<template>
  <v-card>
    <v-card-title>คะแนนรวม</v-card-title>

    <v-card-text>
      <div class="text-center">
        <div class="text-h2 font-weight-bold" :class="scoreColor">
          {{ totalScore.toFixed(2) }}
        </div>
        <div class="text-subtitle-1">/ {{ maxScore }} คะแนน</div>

        <v-progress-linear
          :model-value="percentage"
          :color="progressColor"
          height="25"
          class="mt-4"
        >
          <template v-slot:default="{ value }">
            <strong>{{ Math.ceil(value) }}%</strong>
          </template>
        </v-progress-linear>
      </div>

      <v-divider class="my-4"></v-divider>

      <!-- Topic Scores -->
      <div v-for="topic in topicScores" :key="topic.topic_name" class="mb-3">
        <div class="d-flex justify-space-between align-center mb-1">
          <span class="font-weight-medium">{{ topic.topic_name }}</span>
          <span class="text-primary">
            {{ topic.topic_score.toFixed(2) }} / {{ topic.weight_percentage }}%
          </span>
        </div>
        <v-progress-linear
          :model-value="(topic.topic_score / topic.weight_percentage) * 100"
          color="primary"
          height="8"
        ></v-progress-linear>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  totalScore: { type: Number, required: true },
  maxScore: { type: Number, default: 100 },
  topicScores: { type: Array, default: () => [] }
});

const percentage = computed(() => {
  return (props.totalScore / props.maxScore) * 100;
});

const scoreColor = computed(() => {
  const pct = percentage.value;
  if (pct >= 80) return 'text-success';
  if (pct >= 60) return 'text-warning';
  return 'text-error';
});

const progressColor = computed(() => {
  const pct = percentage.value;
  if (pct >= 80) return 'success';
  if (pct >= 60) return 'warning';
  return 'error';
});
</script>
