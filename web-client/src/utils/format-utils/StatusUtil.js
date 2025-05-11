export const formatStatusBadge = (status) => {
    const statusMap = {
      pending: { text: "Pending", badgeClass: "warning" },
      accepted: { text: "Accepted", badgeClass: "success" },
      rejected: { text: "Rejected", badgeClass: "error" },
      paid: { text: "Paid", badgeClass: "neutral" },
      preparing: { text: "Preparing", badgeClass: "info" },
      ready: { text: "Ready", badgeClass: "info" },
      assigned: { text: "Assigned", badgeClass: "accent" },
      picked_up: { text: "Pickup", badgeClass: "secondary" },
      delivered: { text: "Delivered", badgeClass: "success" },
    };
  
    return statusMap[status] || { text: status, badgeClass: "ghost" };
  };
  