// Test the new UserMetricsEngine
const testUserMetrics = async () => {
  const testRequest = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accountId: '83cededf-914f-4d90-b9b3-917475f7e9d8', // Helios Scale
      userIds: [
        'f187aaac-5e43-4f03-af52-e23db3f0a539', // Riley White
        'd1837ec0-b931-4b2f-9e1c-c86c25b44b79', // Jesse Everett
        '365fdd1f-1aae-4285-ba46-563db26977ba'  // Thomas Zographakis
      ],
      metricName: 'total_appointments',
      dateRange: {
        start: '2024-01-01',
        end: '2024-12-31'
      }
    })
  }

  try {
    const response = await fetch('/api/data-view/user-metrics', testRequest)
    const result = await response.json()
    
    console.log('Test Results:')
    console.log('Status:', response.status)
    console.log('Response:', JSON.stringify(result, null, 2))
    
    if (result.userMetrics) {
      console.log('\nUser Metrics Summary:')
      result.userMetrics.forEach(user => {
        console.log(`- ${user.name}: ${user.displayValue} (role: ${user.actualRole})`)
      })
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run the test
testUserMetrics() 