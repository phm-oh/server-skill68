<template>
  <div class="dashboard">
    <h2>Dashboard</h2>
    <div class="rooms-grid">
      <div class="room-card" v-for="i in 3" :key="i" @click="$router.push('/room/' + i)">
        <h3>Room {{ i }}</h3>
        <p>Temperature: 25°C</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Dashboard'
}
</script>

