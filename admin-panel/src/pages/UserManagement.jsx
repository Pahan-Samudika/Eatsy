import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { userAPI } from '../../../admin-panel/src/services';
import { useToast } from '../../../admin-panel/src/utils/alert-utils/ToastUtil';
import { sendVerifiedNotification } from '../utils/notification-utils/notificationUtil';

function UserManagement() {
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const toast = useToast();
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    fetchDeliveryPersons();
  }, []);

  const fetchDeliveryPersons = async () => {
    try {
      const res = await axios.get(userAPI.GetAllDeliveryPersons);
      if (res) setDeliveryPersons(res.data);
    } catch (err) {
      console.error("Failed to fetch delivery personnel", err);
    }
  };

  const verifyDelivery = async (id, email) => {
    try {
      await axios.put(userAPI.VerifyDeliveryPerson(id, user.id));
      fetchDeliveryPersons();
      await sendVerifiedNotification({ to: email, receiverType: "delivery" });
      toast.success("Delivery Person verified successfully!");
    } catch (err) {
      console.error("Verification failed", err);
      toast.error("Failed to verify delivery person!");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Delivery Management</h2>

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Phone</th>
              <th>Vehicle</th>
              <th>Status</th>
              <th>Availability</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deliveryPersons.map((p) => (
              <tr key={p._id}>
                <td>
                  <div className="avatar">
                    <div className="w-20 rounded-full">
                      <img alt="User avatar" src={p.profileImage} />
                    </div>
                  </div>
                </td>
                <td>{p.name}</td>
                <td>{p.phone}</td>
                <td>{p.vehicleNo || 'N/A'}</td>
                <td>
                  <span className={`badge ${p.verifiedBy ? 'badge-success' : 'badge-warning'}`}>
                    {p.verifiedBy ? 'Verified' : 'Pending'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${p.availability ? 'badge-success' : 'badge-ghost'}`}>
                    {p.availability ? 'Available' : 'Unavailable'}
                  </span>
                </td>
                <td className="space-x-2">
                  {!p.verifiedBy && (
                    <button className="btn btn-xs btn-success" onClick={() => verifyDelivery(p._id, p.email)}>
                      Verify
                    </button>
                  )}
                  <label
                    htmlFor="delivery-details-modal"
                    className="btn btn-xs btn-outline"
                    onClick={() => setSelectedPerson(p)}
                  >
                    View
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {selectedPerson && (
        <>
          <input type="checkbox" id="delivery-details-modal" className="modal-toggle" checked readOnly />
          <div className="modal modal-bottom sm:modal-middle">
            <div className="modal-box max-w-2xl">
              <div className="card card-side bg-base-100 shadow-xl">
                <figure className="w-1/3 p-2">
                  <img src={selectedPerson.profileImage} alt="Profile" className="rounded-lg w-full h-full object-cover" />
                </figure>
                <div className="card-body w-2/3">
                  <h2 className="card-title text-xl">{selectedPerson.name}</h2>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><span className="font-semibold">Email:</span> {selectedPerson.email}</p>
                    <p><span className="font-semibold">Phone:</span> {selectedPerson.phone}</p>
                    <p><span className="font-semibold">NIC:</span> {selectedPerson.nic}</p>
                    <p><span className="font-semibold">Vehicle No:</span> {selectedPerson.vehicleNo}</p>
                    <p><span className="font-semibold">License No:</span> {selectedPerson.licenseNo}</p>
                    <p>
                      <span className="font-semibold">Status:</span>{' '}
                      <span className={`badge ${selectedPerson.verifiedBy ? 'badge-success' : 'badge-warning'}`}>
                        {selectedPerson.verifiedBy ? 'Verified' : 'Pending'}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold">Availability:</span>{' '}
                      <span className={`badge ${selectedPerson.availability ? 'badge-success' : 'badge-ghost'}`}>
                        {selectedPerson.availability ? 'Available' : 'Unavailable'}
                      </span>
                    </p>
                  </div>
                  <div className="modal-action mt-4">
                    <label
                      htmlFor="delivery-details-modal"
                      className="btn btn-sm btn-neutral"
                      onClick={() => setSelectedPerson(null)}
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

export default UserManagement;
