import { useEffect, useState } from "react";
import StockCommentForm from "./StockCommentForm/StockCommentForm";
import {
  commentGetAPI,
  commentPostAPI,
} from "../../Services/CommentService";
import { toast } from "react-toastify";
import Spinner from "../Spinners/Spinner";
import StockCommentList from "../StockCommentList/StockCommentList";

const StockComment = ({ stockSymbol }) => {
  const [commentResult, setCommentResult] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let active = true;
    commentGetAPI(stockSymbol)
      .then((res) => {
        if (active) {
          setCommentResult({
            symbol: stockSymbol,
            reloadCount,
            comments: res?.data ?? [],
          });
        }
      })
      .catch((error) => {
        if (active) {
          toast.warning(error);
          setCommentResult({ symbol: stockSymbol, reloadCount, comments: [] });
        }
      });

    return () => {
      active = false;
    };
  }, [stockSymbol, reloadCount]);

  const loading =
    commentResult?.symbol !== stockSymbol ||
    commentResult?.reloadCount !== reloadCount;
  const comments = loading ? [] : commentResult.comments;

  const handleComment = (e) => {
    commentPostAPI(e.title, e.content, stockSymbol)
      .then((res) => {
        if (res) {
          toast.success("Comment created successfully!");
          setReloadCount((current) => current + 1);
        }
      })
      .catch((error) => {
        toast.warning(error);
      });
  };

  return (
    <div className="flex flex-col">
      {loading ? (
        <Spinner />
      ) : (
        <StockCommentList comments={comments ?? []} />
      )}

      <StockCommentForm
        handleComment={handleComment}
      />
    </div>
  );
};

export default StockComment;
