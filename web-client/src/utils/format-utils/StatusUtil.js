export const formatStatusBadge = (status) => {
    const statusMap = {
      pending: { text: "Pending", badgeClass: "warning" },
      accepted: { text: "Accepted", badgeClass: "success" },
      rejected: { text: "Rejected", badgeClass: "error" },
      paid: { text: "Paid", badgeClass: "warning" },
      preparing: { text: "Preparing", badgeClass: "warning" },
      ready: { text: "Ready", badgeClass: "warning" },
      assigned: { text: "Assigned", badgeClass: "warning" },
      picked_up: { text: "Pickup", badgeClass: "warning" },
      delivered: { text: "Delivered", badgeClass: "success" },
    };
  
    return statusMap[status] || { text: status, badgeClass: "ghost" };
  };
  