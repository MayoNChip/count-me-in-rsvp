export default async function RsvpPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">RSVP Response</h2>
            <p className="text-gray-600">Token: {token}</p>
            <p className="text-gray-600 mt-4">RSVP form coming soon!</p>
          </div>
        </div>
      </div>
    </div>
  )
}