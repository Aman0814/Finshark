
import StockCommentListItem from "../StockCommentListItem/StockCommentListItem";

const StockCommentList = ({ comments }) => {
  return (
    <>
      {comments &&
        comments.map((comment) => (
          <StockCommentListItem
            key={comment.id}
            comment={comment}
          />
        ))}
    </>
  );
};

export default StockCommentList;
