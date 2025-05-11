import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { paymentAPI, orderAPI, userAPI } from '../services';
import { useToast } from '../utils/alert-utils/ToastUtil';
import { sendVerifiedNotification } from '../utils/notification-utils/notificationUtil';

function RestaurantManagement() {
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const user = JSON.parse(localStorage.getItem("user"));
  const toast = useToast();

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const res = await axios.get(userAPI.GetAllRestaurants);
      if (res) setRestaurants(res.data);
    } catch (err) {
      console.error("Failed to fetch restaurants", err);
    }
  };

  const verifyRestaurant = async (id, email) => {
    try {
      await axios.put(userAPI.VerifyRestaurant(id, user.id));
      fetchRestaurants();
      await sendVerifiedNotification({ to: email, receiverType: "restaurant" });
      toast.success("Restaurant verified successfully!");
    } catch (err) {
      console.error("Verification failed", err);
      toast.error("Failed to verify restaurant!");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Restaurant Management</h2>

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Owner</th>
              <th>Location</th>
              <th>Status</th>
              <th>Available</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => (
              <tr key={r._id}>
                <td>
                  <div className="avatar">
                    <div className="w-24 rounded-full">
                      <img alt="User avatar" src={r.profileImage} />
                    </div>
                  </div>
                </td>
                <td>{r.name}</td>
                <td>{r.owner}</td>
                <td>{r.address}</td>
                <td>
                  <span className={`badge ${r.verifiedBy ? 'badge-success' : 'badge-warning'}`}>
                    {r.verifiedBy ? 'Verified' : 'Pending'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${r.availability ? 'badge-success badge-soft' : 'badge-ghost'}`}>
                    {r.availability ? 'Open' : 'Closed'}
                  </span>
                </td>
                <td className="space-x-2">
                  {r.verifiedBy == null && (
                    <button className="btn btn-xs btn-success" onClick={() => verifyRestaurant(r._id, r.email)}>
                      Verify
                    </button>
                  )}
                  <button
                    className="btn btn-xs btn-outline"
                    onClick={() => setSelectedRestaurant(r)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selectedRestaurant && (
        <>
          <input type="checkbox" id="restaurant-details-modal" className="modal-toggle" checked readOnly />
          <div className="modal modal-bottom sm:modal-middle">
            <div className="modal-box max-w-3xl">
              <div className="card card-side bg-base-100 shadow-xl">
                <figure className="w-1/3 p-2">
                  <img src={selectedRestaurant.profileImage} alt="Profile" className="rounded-lg w-full h-full object-cover" />
                </figure>
                <div className="card-body w-2/3">
                  <h2 className="card-title text-xl">{selectedRestaurant.name}</h2>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><span className="font-semibold">Owner:</span> {selectedRestaurant.owner}</p>
                    <p><span className="font-semibold">Phone:</span> {selectedRestaurant.phone}</p>
                    <p><span className="font-semibold">Address:</span> {selectedRestaurant.address}</p>
                    <p><span className="font-semibold">Business Reg No:</span> {selectedRestaurant.businessRegNo}</p>
                    <p><span className="font-semibold">Delivery Fee:</span> Rs. {selectedRestaurant.deliveryFee}</p>
                    <p><span className="font-semibold">Rating:</span> ⭐ {selectedRestaurant.rating}</p>
                    
                    <p><span className="font-semibold">Email:</span> {selectedRestaurant.email}</p>
                    <p>
                      <span className="font-semibold">Status:</span>{' '}
                      <span className={`badge ${selectedRestaurant.verifiedBy ? 'badge-success' : 'badge-warning'}`}>
                        {selectedRestaurant.verifiedBy ? 'Verified' : 'Pending'}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold">Availability:</span>{' '}
                      <span className={`badge ${selectedRestaurant.availability ? 'badge-success' : 'badge-ghost'}`}>
                        {selectedRestaurant.availability ? 'Open' : 'Closed'}
                      </span>
                    </p>
                  </div>
                  <div className="modal-action mt-4">
                    <label
                      htmlFor="restaurant-details-modal"
                      className="btn btn-sm btn-neutral"
                      onClick={() => setSelectedRestaurant(null)}
                    >
                      Close
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

export default RestaurantManagement;
